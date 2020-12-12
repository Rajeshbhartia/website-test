var createError = require('http-errors');
var express = require('express');
var path = require('path');
var app = express();
const menuTree = require('./public/resources/menuTree.json');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

//connect with database
const mariadb = require('mariadb');
const { response } = require('express');
const pool = mariadb.createPool({
	host: '192.168.207.45',
	user: 'root',
	password: 'root',
	//  connectionLimit: 5,
	database: 'website_test_2'
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

// function capitalize(string) {
// 	return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
// }

// function createSubMenu(ele, path, menuTree) {
// 	let steps = path.split('/');
// 	steps.shift();
// 	let fSt = steps[0]
// 	if (steps.length === 1) {
// 		if (!menuTree[fSt]) {
// 			menuTree[fSt] = {}
// 			menuTree[fSt].name = capitalize(fSt)
// 			menuTree[fSt].path = "#"
// 			menuTree[fSt].menuSet = new Set()
// 			menuTree[fSt].menuSet.add(ele);
// 			menuTree[fSt].submenu = Array.from(menuTree[fSt].menuSet);
// 		} else {
// 			menuTree[fSt].menuSet.add(ele)
// 			menuTree[fSt].submenu = Array.from(menuTree[fSt].menuSet);
// 		}
// 	} else {
// 		let ind = path.indexOf(steps[1])
// 		let nPath = ''
// 		if (ind > 0)
// 			nPath = '/' + path.substring(ind)
// 		if (!menuTree[fSt]) {
// 			menuTree[fSt] = {}
// 			menuTree[fSt].name = fSt
// 			menuTree[fSt].path = "#"
// 			let c = createSubMenu(ele, nPath, menuTree[fSt])
// 			menuTree[fSt].menuSet = new Set()
// 			menuTree[fSt].menuSet.add(c);
// 			menuTree[fSt].submenu = Array.from(menuTree[fSt].menuSet);
// 		} else {
// 			let c = createSubMenu(ele, nPath, menuTree[fSt])
// 			menuTree[fSt].menuSet.add(c);
// 			menuTree[fSt].submenu = Array.from(menuTree[fSt].menuSet);
// 		}
// 	}
// 	return menuTree[fSt]
// }

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

function getCategories(categories) {
	let allCategories = [];
	categories.forEach(item => allCategories.push(Object.keys(item).join()));
	return allCategories;
}

// function prevNextItems(categoryItems, path) {
// 	let prevNext = [];
// 	categoryItems.map((item, index) => {
// 		if (item.path === path) {
// 			prevNext.push(categoryItems[index - 1]);
// 			prevNext.push(categoryItems[index + 1]);
// 		}
// 	})
// 	return prevNext;
// }

(async function GeneratePage() {

	// let fResp = await onAppQuery('contents', 'url,name,menu_order,menu_path', `WHERE NULLIF(menu_path, '') IS NOT NULL AND status= 'published'`);
	// console.log(fResp)
	// let menuTree = {};
	// fResp = fResp.sort((a, b) => {
	// 	return a.menu_order - b.menu_order
	// })

	// fResp.forEach(element => {
	// 	if (element.menu_path !== '/') {
	// 		createSubMenu(element, element.menu_path, menuTree)
	// 	} else {
	// 		menuTree[element.name] = element
	// 	}
	// });


	app.use(async (req, res, next) => {

		const NS_PER_SEC = 1e9;
		var calltime = process.hrtime()

		try {
			// word.endsWith("e")
			let path = req.url;
			if (path.endsWith("/") && path.length > 1) path = path.substring(0, path.length - 1)
			let name = null;
			if (path === '/') {
				name = 'home'
			} else {
				name = path.split("/").pop()
			}
			let resp = await onAppQuery('contents', '*', `WHERE name = '${name}' AND status= 'published'`);

			// console.log(resp);

			if (resp.length) {
				if (resp[0].layout === 'documentation') {

					// let docsResp = await onAppQuery('contents', 'name,title, url_path, tags', `WHERE tags LIKE '%${resp[0].name.toLowerCase()}%' AND status= 'published' ORDER BY creation_date asc`);
					let layResp = await onAppQuery('layouts', 'menu', `WHERE layout = '${resp[0].layout}'`);
					// let categories = JSON.parse(layResp[0].extra).categories;
					console.log(JSON.parse(layResp[0].menu)[resp[0].name])
					let cwData = JSON.parse(layResp[0].menu)[resp[0].name];
					res.render('documentationLayout', { bodyData: resp[0], response: menuTree, cwData });

				} else if (resp[0].layout === 'doc_details') {
					let layResp = await onAppQuery('layouts', 'extra', `WHERE layout = '${resp[0].layout}'`);

					console.log(resp[0])
					// res.send(resp[0])
					// let docsResp = await onAppQuery('contents', 'name, url, tags', `WHERE post_type = '${resp[0].post_type}' AND status= 'published' ORDER BY creation_date asc`);
					// console.log(docsResp)
					// let categoryItems = await docsResp.filter(item => {
					// 	if (item.category === resp[0].category) return item;
					// })

					// let prevNextPost = prevNextItems(categoryItems, resp[0].path);
					// let categories = new Set();
					// docsResp.forEach(item => categories.add(item.category.toLowerCase()));
					// let popularPosts = await onAppQuery('contents', 'name, path', `WHERE content_type = 'post' AND status= 'published' ORDER BY hits desc LIMIT 5`);
					res.render('docDetailsLayout', { bodyData: resp[0], response: menuTree });

				} else if (resp[0].layout === 'blog' || resp[0].layout === 'blog_details') {

					let allBlogs = await onAppQuery('contents', 'url_path, name, title, tags,creation_date, author, images, abstract', `WHERE layout = 'blog_details' AND status= 'published' ORDER BY creation_date desc`);

					let cwData = await onAppQuery('layouts', 'menu', `WHERE layout = '${resp[0].layout}'`);
					let categories = getCategories(JSON.parse(cwData[0].menu));

					let yearWiseData = makeDateWisePost(allBlogs);
					let loadedLayout = resp[0].layout === 'blog' ? 'blogLayout' : 'blogDetailsLayout'
					res.render(loadedLayout, { bodyData: resp[0], response: menuTree, allBlogs, categories, cwData: JSON.parse(cwData[0].menu), yearWiseData });

				} else if (resp[0].layout === 'contact_us') {
					res.render('contactUsLayout', { bodyData: resp[0], response: menuTree });
				} else if (resp[0].layout === 'support_home') {
					res.render('supportHomeLayout', { bodyData: resp[0], response: menuTree });
				}
				else {
					res.render('layout', { bodyData: resp[0], response: menuTree });
				}
				const diff = process.hrtime(calltime);
				console.log(`Benchmark took ${(diff[0] * NS_PER_SEC + diff[1]) / 1000000} ms`);
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