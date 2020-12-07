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

function onAppQuery(tableName, columns, args) {
	return new Promise(async (res, rej) => {
		let conn;
		try {
			conn = await pool.getConnection();
			let rows = await conn.query(`SELECT ${columns} FROM ${tableName} ${args}`);
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
	pPath = pPath.replace(/\b\w/g, l => l.toUpperCase());
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


function makeDateWisePost(posts) {
	let obj = {}
	const monthNames = ["January", "February", "March", "April", "May", "June",
		"July", "August", "September", "October", "November", "December"
	];
	posts.forEach(item => {
		let year = new Date(item.creation_date).getFullYear()
		let month = monthNames[new Date(item.creation_date).getMonth()];
		if (obj.hasOwnProperty(year)) {
			if (obj[year].hasOwnProperty(month)) {
				obj[year][month].push(item)
			} else {
				obj[year][month] = [item];
			}
		} else {
			obj[year] = {}
			obj[year][month] = [item]
		}
	})
	return obj;
}

(async function GeneratePage() {
	let fResp = await onAppQuery('contents', 'path,name,menu,menu_order,sub_menu,sub_menu_order', `WHERE menu = 'yes'`);
	let menuTree = [];
	fResp = fResp.sort((a, b) => {
		return a.menu_order - b.menu_order
	})

	fResp.forEach(element => {
		if (element.sub_menu === 'yes') {
			createSubMenu(element, menuTree)
		} else {
			menuTree.push(element)
		}
	});

	app.use(async (req, res, next) => {
		try {
			let resp = await onAppQuery('contents', '*', `WHERE path = '${req.path}' AND status= 'published'`);
			if (resp.length) {
				if (resp[0].layout === 'documentation') {

					let docsResp = await onAppQuery('contents', '*', `WHERE post_type = '${resp[0].name.toLowerCase()}' AND status= 'published'`);
					let categories = new Set();
					docsResp.forEach(item => categories.add(item.category));

					let popularPosts = await onAppQuery('contents', 'name,path', `WHERE content_type = 'post' AND status= 'published' ORDER BY hits desc LIMIT 5`);
					let recentPosts = await onAppQuery('contents', 'name,path', `WHERE content_type = 'post' AND status= 'published' ORDER BY creation_date desc LIMIT 5`);


					res.render('index', { bodyData: resp[0], response: menuTree, categories: Array.from(categories), docsResp, popularPosts, recentPosts });
				} else if (resp[0].layout === 'doc_details') {

					let docsResp = await onAppQuery('contents', 'name, path, category', `WHERE post_type = '${resp[0].post_type}' AND status= 'published'`);
					let categories = new Set();
					docsResp.forEach(item => categories.add(item.category));

					let popularPosts = await onAppQuery('contents', 'name, path', `WHERE content_type = 'post' AND status= 'published' ORDER BY hits desc LIMIT 5`);
					res.render('index', { bodyData: resp[0], response: menuTree, popularPosts, docsResp, categories: Array.from(categories) });

				} else if (resp[0].layout === 'blog' || resp[0].layout === 'blog_details') {
					let allBlogs = await onAppQuery('contents', 'path,name,category,creation_date,post_author,post_image,post_heading', `WHERE content_type = 'blog' AND status= 'published' ORDER BY creation_date desc`);
					let cwds = {}
					allBlogs.forEach(item => {
						if (cwds.hasOwnProperty(item.category)) {
							cwds[item.category].push(item)
						} else {
							cwds[item.category] = [item]
						}
					})
					let yearWiseData = makeDateWisePost(allBlogs);
					res.render('index', { bodyData: resp[0], response: menuTree, allBlogs, catData: cwds, yearWiseData });
				}
				else
					res.render('index', { bodyData: resp[0], response: menuTree });
			}
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