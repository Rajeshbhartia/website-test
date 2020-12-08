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

function capitalize(string) {
	return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

function createSubMenu(ele, path, menuTree) {
	let steps = path.split('/');
	steps.shift();
	let fSt = steps[0]
	if (steps.length === 1) {
		if (!menuTree[fSt]) {
			menuTree[fSt] = {}
			menuTree[fSt].name = capitalize(fSt)
			menuTree[fSt].path = "#"
			menuTree[fSt].menuSet = new Set()
			menuTree[fSt].menuSet.add(ele);
			menuTree[fSt].submenu = Array.from(menuTree[fSt].menuSet);
		} else {
			menuTree[fSt].menuSet.add(ele)
			menuTree[fSt].submenu = Array.from(menuTree[fSt].menuSet);
		}
	} else {
		let ind = path.indexOf(steps[1])
		let nPath = ''
		if (ind > 0)
			nPath = '/' + path.substring(ind)
		if (!menuTree[fSt]) {
			menuTree[fSt] = {}
			menuTree[fSt].name = fSt
			menuTree[fSt].path = "#"
			let c = createSubMenu(ele, nPath, menuTree[fSt])
			menuTree[fSt].menuSet = new Set()
			menuTree[fSt].menuSet.add(c);
			menuTree[fSt].submenu = Array.from(menuTree[fSt].menuSet);
		} else {
			let c = createSubMenu(ele, nPath, menuTree[fSt])
			menuTree[fSt].menuSet.add(c);
			menuTree[fSt].submenu = Array.from(menuTree[fSt].menuSet);
		}
	}
	return menuTree[fSt]
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
	let fResp = await onAppQuery('contents', 'path,name,menu_order,menu_path', `WHERE NULLIF(menu_path, '') IS NOT NULL AND status= 'published'`);
	let menuTree = {};
	fResp = fResp.sort((a, b) => {
		return a.menu_order - b.menu_order
	})

	fResp.forEach(element => {
		if (element.menu_path !== '/') {
			createSubMenu(element, element.menu_path, menuTree)
		} else {
			menuTree[element.name] = element
		}
	});

	app.use(async (req, res, next) => {
		try {
			// word.endsWith("e")
			let path = req.path;
			if (path.endsWith("/") && path.length > 1) path = path.substring(0, path.length - 1)

			let resp = await onAppQuery('contents', '*', `WHERE path = '${path}' AND status= 'published'`);
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