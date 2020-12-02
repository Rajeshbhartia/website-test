var createError = require('http-errors');
var express = require('express');
var path = require('path');
var app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

//connect with database
const mariadb = require('mariadb');
const pool = mariadb.createPool({
	host: '192.168.207.45',
	user: 'root',
	password: 'root',
	//  connectionLimit: 5,
	database: 'website_test'
});

function onAppQuery(object, args) {
	return new Promise(async (res, rej) => {
		let conn;
		try {
			conn = await pool.getConnection();
			let rows = await conn.query(`SELECT ${object} FROM pages ${args}`);
			res(rows);
		} catch (err) {
			console.log(err)
			throw err;
		} finally {
			if (conn) return conn.end();
		}
	})
}

app.use(async (req, res, next) => {
	try {
		let fResp = await onAppQuery('path,name,menu,menu_order', `WHERE menu = '1'`);
		let resp = await onAppQuery('content,meta,layout', `WHERE path = '${req.path}'`);
		res.render('index', { bodyData: resp[0], response: fResp });
	} catch (error) {
		next(createError(404));
	}
})

// error handler
app.use(function (err, req, res, next) {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};
	// render the error page
	res.status(err.status || 500);
	res.render('error');
});

module.exports = app;