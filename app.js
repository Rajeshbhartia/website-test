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
function createSubMenu(ele, array) {
	const sourceStr = ele.path;
	// let array = [...arr];

	const searchStr = '/';
	const indexes = [...sourceStr.matchAll(new RegExp(searchStr, 'gi'))].map(a => a.index);
	let pPath = sourceStr.substring(indexes[0] + 1, indexes[1]);
	const found = array.find(element => element.name === pPath);
	if (found) {
		found.submenu.push(ele);
		found.submenu.sort((a, b) => {
			return a.menu_order - b.menu_order
		});

	} else {
		let elem = {}
		elem.name = pPath;
		elem.path = "#";
		elem.menu = ele.menu;
		elem.menu_order = ele.menu_order;
		elem.submenu = [];
		elem.submenu.push(ele)
		array.push(elem);
	}
}

(async function GeneratePage() {
	let fResp = await onAppQuery('path,name,menu,menu_order,sub_menu,sub_menu_order', `WHERE menu = '1'`);
	let menuTree = [];

	fResp = fResp.sort((a, b) => {
		return a.menu_order - b.menu_order
	})

	fResp.forEach(element => {
		if (element.sub_menu) {
			createSubMenu(element, menuTree)
		} else {
			menuTree.push(element)
		}
	});

	app.use(async (req, res, next) => {
		try {
			let resp = await onAppQuery('content,meta,layout', `WHERE path = '${req.path}'`);
			if (resp.length)
				res.render('index', { bodyData: resp[0], response: menuTree });
			else next(createError(404, 'This Content does not exist!', { extraProp: "Error Layout Data " }));
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
})()


module.exports = app;