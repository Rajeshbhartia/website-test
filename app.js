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
const { json } = require('body-parser');
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

(async function GeneratePage() {
	let webResp = await onAppQuery('websites', '*', ``);
	let sites = {};
	while (webResp.length) {
		let cfg = webResp.shift();
		sites[cfg.website] = cfg;
	}


	app.use(async (req, res, next) => {
		const NS_PER_SEC = 1e9;
		var calltime = process.hrtime()
		var settings = sites[req.hostname];
		try {
			let path = req.url;
			if (path.endsWith("/") && path.length > 1) path = path.substring(0, path.length - 1)
			let name = null;
			if (path === '/') {
				name = 'home'
			} else {
				name = path.split("/").pop()
			}
			let resp = await onAppQuery('contents', '*', `WHERE website = '${req.hostname}' AND name = '${name}' AND status= 'published'`);

			if (resp.length) {
				if (resp[0].layout === 'documentation') {
					let allPostResp = await onAppQuery('contents', 'name,title,url_path,tags', `WHERE website = '${req.hostname}' AND layout = '${resp[0].name}' AND status= 'published' ORDER BY creation_date asc`);
					let categories = await onAppQuery('layouts', 'menu', `WHERE layout = '${resp[0].name}'`);
					categories = JSON.parse(categories[0].menu)
					res.render('documentationLayout', { bodyData: resp[0], settings, allPostResp, categories });
				} else if (resp[0].layout === 'faq' || resp[0].layout === 'installation' || resp[0].layout === 'troubleshooting') {
					let allPostResp = await onAppQuery('contents', 'name,title,url_path,tags', `WHERE website = '${req.hostname}' AND layout = '${resp[0].layout}' AND status= 'published' ORDER BY creation_date asc`);

					let docsResp = await onAppQuery('contents', 'name,title, url_path', `WHERE layout = '${resp[0].layout}' AND status= 'published' ORDER BY creation_date asc LIMIT 6`);
					let recentPost = await onAppQuery('contents', 'name,title, url_path', `WHERE layout = 'faq' or layout = 'installation' or layout = 'troubleshooting' AND status= 'published' ORDER BY creation_date asc LIMIT 5`);
					let layResp = await onAppQuery('layouts', 'menu', `WHERE layout = '${resp[0].layout}'`);
					let categories = JSON.parse(layResp[0].menu);
					res.render('docDetailsLayout', { bodyData: resp[0], settings, parentNode: resp[0].layout, docsResp, categories, recentPost, allPostResp });

				} else if (resp[0].layout === 'blog' || resp[0].layout === 'blog_details') {
					let allBlogs = await onAppQuery('contents', 'url_path, name, title, tags,creation_date, author, images, abstract', `WHERE layout = 'blog_details' AND status= 'published' ORDER BY creation_date desc`);
					let cwData = await onAppQuery('layouts', 'menu', `WHERE layout = '${resp[0].layout}'`);
					let categories = getCategories(JSON.parse(cwData[0].menu));
					let yearWiseData = makeDateWisePost(allBlogs);
					let loadedLayout = resp[0].layout === 'blog' ? 'blogLayout' : 'blogDetailsLayout'
					res.render(loadedLayout, { bodyData: resp[0], settings, allBlogs, categories, cwData: JSON.parse(cwData[0].menu), yearWiseData });

				} else if (resp[0].layout === 'contact_us') {
					res.render('contactUsLayout', { bodyData: resp[0], settings });
				} else if (resp[0].layout === 'support_home') {
					res.render('supportHomeLayout', { bodyData: resp[0], settings });
				}
				else {
					res.render('layout', { bodyData: resp[0], settings });
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