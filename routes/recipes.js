let express = require('express');
let router = express.Router();

const fs = require('fs');

/* GET home page. */
//let recipes = new Array(); 

//Показване на Login форма
router.get('/login', function(req, res) {
	res.render('login', {info: 'Моля влезте в профила'});
});
//Може да тестваме логин формата --> npm start или nodemon --> http://127.0.0.1:3000/recipes/login
//Защо при изпращане на данните от формата възникна грешка?

//Създаване на сесия след успешен Login
session = require('express-session'); //Как да инсталираме и намерим информация за този модул?
router.use(session({
    secret: 'random string',
    resave: true,
    saveUninitialized: true,
}));

sqlite3 = require('sqlite3');
db = new sqlite3.Database('recipes2.sqlitedb');
db.serialize();
db.run(`CREATE TABLE IF NOT EXISTS recipes(
    id INTEGER PRIMARY KEY,
    user TEXT NOT NULL,
	recipe TEXT,
    ingredients TEXT,
	cooking TEXT,
    url TEXT,
    date_created TEXT,
    date_modified TEXT)`
);
db.parallelize();

fileUpload = require('express-fileupload');
router.use(fileUpload());

bcrypt = require('bcryptjs');
users = require('./passwd.json');

router.post('/login', function(req, res){
	bcrypt.compare(req.body.password, users[req.body.username] || "", function(err, is_match) {
		if(err) throw err;
		if(is_match === true) {
			req.session.username = req.body.username;
			req.session.count = 0;
			res.redirect("/recipes/");
		} else {
			res.render('login', {warn: 'Грешно потребителско име или парола!'});
		}
	});
});
//Може да тестваме логин формата --> http://127.0.0.1:3000/recipes/login

//Logout - унищожаване на сесия
router.get('/logout', (req, res) => {
	req.session.destroy();
	res.redirect("/recipes/");
});

//Всеки потребител със собствен файл
//let filename = "";



router.all('*', function(req, res, next) {
	if(!req.session.username) {
		res.redirect("/recipes/login");
		return;
	}
	next();
	/*filename = req.session.username + ".txt";

	fs.readFile(filename, (err, data) => {
		if(err) recipes = new Array();
		else {
			recipes = data.toString().split("\n").filter(s => s.length > 0);
		}
		next();
	});*/
});


//CRUD
//cREADud
router.get('/', function(req, res, next) {
	req.session.count++;
	s = "Потребител: " + req.session.username;

	//res.render('recipes', { info: s, recipes: recipes });
	db.all('SELECT * FROM recipes ORDER BY date_modified DESC;', function(err, rows) {
		if(err) throw err;
		res.render('recipes', {user: req.session.username, info: s, rows: rows})
	});
});

/*router.post('/', function(req, res, next) {
	let q = req.body;
	if(q.action=="add") recipes.push(q.recipes);
	if(q.action=="del") recipes.splice(q.recipes, 1);
	if(q.action=="add" || q.action=="del") {
		let txt = '';
		for(v of recipes) txt += v+"\n";
		fs.writeFile(filename, txt, (err) => {
			if (err) throw err;
			console.log('The file has been saved!');
		});
	}
	res.render('recipes', { title: 'Express', recipes: recipes });
res.redirect("/recipes/");
});*/

//CREATErud + Picture upload
router.post('/upload',(req, res) => {
    url = "";
    if(req.files && req.files.file) {
        req.files.file.mv('./public/images/' + req.files.file.name, (err) => {
            if (err) throw err;
        });
        url = '/images/' + req.files.file.name;
    }

    db.run(`
        INSERT INTO recipes(
            user,
			recipe,
            ingredients,
			cooking,
            url,
            date_created,
            date_modified
        ) VALUES (
            ?,
            ?,
            ?,
			?,
			?,
            DATETIME('now','localtime'),
            DATETIME('now','localtime'));
        `,
        [req.session.username, req.body.recipe, req.body.ingredients, req.body.cooking || "", url],
        (err) => {
            if(err) throw err;
            res.redirect('/recipes/');
        });
});

//cruDELETE
router.post('/delete', (req, res) => {
	db.all('SELECT * FROM recipes WHERE id = ? AND user = ?;', req.body.id, req.session.username, function(err, rows) {
		if(err) throw err;
		if(rows.length > 0) {
			db.run('DELETE FROM recipes WHERE id = ?', req.body.id, (err) => {
				if(err) throw err;
				res.redirect('/recipes/');
			});
		} else {
			db.all('SELECT * FROM recipes ORDER BY date_modified DESC;', function(err, rows) {
				if(err) throw err;
				res.render('recipes', {user: req.session.username, info: 'Отказан достъп!!!', rows: rows})
			});
		};
	});	
});

//crUPDATEd
router.post('/update', (req, res) => {
	db.all('SELECT * FROM recipes WHERE id = ? AND user = ?;', req.body.id, req.session.username, function(err, rows) {
		//if(err) throw err;
		if(rows.length > 0) {
			 db.run(`UPDATE recipes
            SET user = ?,
				recipe = ?,
				ingredients = ?,
				cooking = ?,
                url = ?,
                date_modified = DATETIME('now','localtime')
            WHERE id = ?;`,
        req.session.username,
		req.body.recipe,
        req.body.ingredients,
		req.body.cooking,
        req.body.url,
        req.body.id,
        (err) => {
            if(err) throw err;
            //res.render('/recipes/');
		 // res.render('recipes', {rows: rows})
		 
    });
	db.all('SELECT * FROM recipes ORDER BY date_modified DESC;', function(err, rows) {
		if(err) throw err;
		res.render('recipes', {user: req.session.username, info: s, rows: rows});});
		} else {
			db.all('SELECT * FROM recipes ORDER BY date_modified DESC;', function(err, rows) {
				if(err) throw err;
				res.render('recipes', {user: req.session.username, info: 'Отказан достъп!!!', rows: rows})
			});
		};
	});


  /*  db.run(`UPDATE recipes
            SET user = ?,
                task = ?,
                url = ?,
                date_modified = DATETIME('now','localtime')
            WHERE id = ?;`,
        req.session.username,
        req.body.task,
        req.body.url,
        req.body.id,
        (err) => {
            if(err) throw err;
            res.redirect('/recipes/');
    });*/
});

router.all('*', function(req, res) {
    res.send("No such page or action! Go to: <a href='/recipes/'>main page</a>");
});

module.exports = router;
