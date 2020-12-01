var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
// var logger = require('morgan');
var app = express();

// let layoutData = require('./public/resources/layout.json')

//connect with database
const mariadb = require('mariadb');
const pool = mariadb.createPool({
	host: 'localhost',
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

(async function GeneratePage() {
	let res = await onAppQuery('path,name,menu,menu_order,layout,meta', `WHERE menu = '1'`);
	// view engine setup
	// console.log(res);

	app.set('views', path.join(__dirname, 'views'));
	app.set('view engine', 'jade');
	// app.use(logger('dev'));
	app.use(express.json());
	app.use(express.urlencoded({ extended: false }));
	app.use(cookieParser());
	app.use(express.static(path.join(__dirname, 'public')));
	let response = {};
	response.rows = res;

	for (let i = 0; i < res.length; i++) {
		let cd = res[i];
		app.get(cd.path, async (req, res) => {
			let resp = await onAppQuery('content', `WHERE name = '${cd.name}'`);
			res.render('index', { bodyData: { content: resp[0].content, resp: cd }, response });
		})
	}

	// catch 404 and forward to error handler
	app.use(function (req, res, next) {
		next(createError(404));
	});

	// error handler
	app.use(function (err, req, res, next) {
		// set locals, only providing error in development
		res.locals.message = err.message;
		res.locals.error = req.app.get('env') === 'development' ? err : {};
		// render the error page
		res.status(err.status || 500);
		res.render('error');
	});
})()

module.exports = app;