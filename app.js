var users = [];
var active_users = {}
var user_count = 0;

var fs = require('fs');

var url_map = {};

const http = require('http');
var fs = require('fs');

var users_progress = {};

// files with functions included here
// the variable "quiz" holds all the questions
eval(fs.readFileSync('quizz.js')+'');

// local: 192.168.72.217, 192.168.1.133 , WAN: 81.170.178.55    , 83.209.51.52
const hostname = '192.168.72.217';
const port = 3002;

function parse_cookies (request) {
	var map = {},
	rc = request.headers.cookie;

	rc && rc.split(';').forEach(function( cookie ) {
		var parts = cookie.split('=');
		try {
			map[parts.shift().trim()] = decodeURIComponent(escape(decodeURI(parts.join('='))));
		} catch( e) {
			map[parts.shift().trim()] = parts.join('=');
		}
	});

	return map;
}

function get_user(name) {
	for ( var i = 0; i < users.length; i++ ) {

		if ( name == users[i]["name"] ) {
			return users[i];
		}
	}

	return undefined;
}

/*
* Each question will be mapped with a specific URL, if the cookie is registered in the 'users'
*/
function render_the_urls(){
	var url_len = 20;
	var urls = [];

	var possible_chars = "B9IJX5x6p03dgDoM8lOYq1kLjNCsiuGc2Tz7ySWAmrhfRPaEKtZHbVeFwvUn4Q";

	for ( var i = 0; i < quiz.length; i++ ) {
		var url = "/";

		var q_text = quiz[i]["question"];
		for (var n = 0; n < url_len; n++)
			url += possible_chars.charAt( (q_text.charCodeAt(n % q_text.length)  ) % possible_chars.length);
		quiz[i]["url"] = url;
		url_map[url] = i;
	}

}

function has_finished(user) {

	if ( !user in users_progress )
		return false;

	var ans = users_progress[user]["answers"];

	var questions = quiz.length;

	var answered = 0;

	for ( key in ans ) {
		answered++;
	}

	if ( answered == questions ) 
		return true;

}

function log_status_report(console_print=true) {

	var status_report = {}

	for ( user in users_progress ) {

		var corrects = 0;

		for ( key in users_progress[user]["answers"] ) {

			var question = key;
			var guess = users_progress[user]["answers"][key];

			var correct = quiz[parseInt(question)]["correct"];

			if ( correct == guess )
				corrects++;

		}

		status_report[user] = corrects;

		if ( console_print ){
			console.log("user: " + user);
			console.log("	score: " + corrects + "/" + quiz.length);
		}

	}

	return status_report;

}

var qs = require('querystring');

const server = http.createServer((req, res) => {
	res.statusCode = 200;

	var d = new Date();

	var cookies = parse_cookies(req);

	console.log(req.url);

	if ( typeof url_map[req.url] != "undefined" ) {
		// Identify that this is a registered user first. 
		//
		// The quizzer has found a QR-code!
		// It will be redirected to the start page, but have
		// gotten a new state in the app system. 
		// It will affect what is outputted in the /update call!

		res.writeHead(200, {
			"Content-Type": "text/html",
			"Cache-Control": "no-cache, no-store, must-revalidate"
		});

		var answer = {
			"status" 	: "OK",
			"question" 	: url_map[req.url]["question"],
			"1" 	: url_map[req.url]["1"],
			"X" 	: url_map[req.url]["2"],
			"2" 	: url_map[req.url]["X"]
		}		

		var user = cookies["username"];

		try {

			if ( typeof user != "undefined" && (user.length > 0 && user.length < 100) && (user in users_progress) ) {
				// UPDATE THE STATE MACHINE FOR THE USER
				users_progress[user]["status"] = "GO";
				users_progress[user]["latest-quiz-quiestion"] = url_map[req.url];

			}

		} catch(e) {;}


		res.writeHead(302, {
			'Location': '/'
		});
		res.end();

	} else if ( req.url == "/favicon.ico" ) {
		// output favicon.ico

       	var icon = fs.readFileSync('favicon.ico');
        res.writeHead(200, {'Content-Type': 'image/jpg'});
        res.end(icon);

	} else if ( req.url == "/" ) {
			fs.readFile('index.html', function(err, data) {
			if ( err ){
				console.log(err);
			}
			res.writeHead(200, {'Content-Type': 'text/html'});
			res.write(data);
			res.end();
		});
	} else if ( req.url == "/register" ) {

		var new_user = cookies["username"];

		var answer = {
			"status" 	: "OK",
			"message" 	: "New user added: " + new_user["name"]
		}

		res.writeHead(200, {
			"Content-Type": "application/json; charset=utf-8",
			"Cache-Control": "no-cache, no-store, must-revalidate"
		});

		if ( new_user.length == 0 || new_user.length > 100 ) {
			answer["status"] = "ERROR";
			answer["message"] = "Invalid user name";

			console.log("Not adding user: " + new_user + ", invalid username");
		} else if ( ! ( new_user in users_progress ) ) {
			// This is a new user
			users_progress[new_user] = {
				"status" 				 : "REG",
				"info"	 				 : "user just registered",
				"latest-quiz-quiestion"  : -1, 
				"answers"				 : {}
			}

			console.log("Added user: " + new_user);

		} else {
			// This user has already been registered
			answer["status"] = "ERROR";
			answer["message"] = "User: " + new_user["name"] + " already registered.";
			
			console.log("Not adding user: " + new_user + ", user already registered");
		}

		res.write(JSON.stringify(answer));

		res.end();

	} else if ( req.url == "/update" ) {

		res.writeHead(200, {
			"Content-Type": "application/json; charset=utf-8",
			"Cache-Control": "no-cache, no-store, must-revalidate"
		});

		var answer = {
			"status" 	: "ERROR",
			"message" 	: "Unknown error",
			"state"		: "UNKNOWN"
		}

		var user = cookies["username"];

		if ( user in users_progress ) {

			if ( users_progress[user]["status"] == "REG" ) {
				// No quiz QR code has been found for the user
				answer["status"] = "OK";
				answer["state"] = "REG";
				answer["message"] = 'Lycka till ' + user + '!';

			} else if ( users_progress[user]["status"] == "GO" ) {
				// The quizzer has found at least one QR-code!
				answer["status"] = "OK";
				answer["state"] = "QUIZ";
				answer["message"] = user + " har hittat en quiz-fråga!";
				answer["question"] = quiz[ users_progress[user]["latest-quiz-quiestion"] ]["question"];
				answer["question_id"] =  users_progress[user]["latest-quiz-quiestion"];
				answer["1"] =  quiz[ users_progress[user]["latest-quiz-quiestion"] ]["1"];
				answer["X"] =  quiz[ users_progress[user]["latest-quiz-quiestion"] ]["X"];
				answer["2"] =  quiz[ users_progress[user]["latest-quiz-quiestion"] ]["2"];

				if ( typeof quiz[ users_progress[user]["latest-quiz-quiestion"] ]["image"] !== "undefined" ) {
					answer["image"] = quiz[ users_progress[user]["latest-quiz-quiestion"] ]["image"];
				}

			} else if ( users_progress[user]["status"] == "HIGHSCORE" ) {

				var status_report = log_status_report(false);

				res.writeHead(200, {
					"Content-Type": "application/json; charset=utf-8",
					"Cache-Control": "no-cache, no-store, must-revalidate"
				});

				answer["status"] = "OK";
				answer["state"] = "HIGHSCORE";
				answer["message"] = "Resultat";
				answer["highscore"] = status_report;

				var show_results = has_finished(user);

				if ( show_results ) {

					answer["quiz-summary"] = {};

					for ( var q = 0; q < quiz.length; q++ ) {
						answer["quiz-summary"][""+(q+1)] = {"question": quiz[q]["question"], "correct": quiz[q][ quiz[q]["correct"] ], "answer":  quiz[q][users_progress[user]["answers"][""+q]]};
					}

				}
	
			}

		} else {
			// This user has not been registered
			answer["status"] = "ERROR";
			answer["state"] = "NOREG";
			answer["message"] = "Laget måste vara registrerat innan det kan delta, vad är namnet på laget?"
		}

		res.write( JSON.stringify(answer) );

		res.end();

	} else if ( req.url == "/guess" ) {

		var res_answer = {};

		if (req.method == 'POST') {
			var body = '';

			req.on('data', function (data) {
				body += data;

				// Too much POST data, kill the connection!
				// 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
				if (body.length > 1e6)
					req.connection.destroy();
			});

			req.on('end', function () {
				var post = JSON.parse(body);
				// use post['blah'], etc.

				res_answer["status"] = "OK";

				if ( typeof post["answer"] == "undefined" || typeof post["question"] == "undefined") {

					res_answer["status"] = "ERROR";
					res_answer["message"] = "No answer or question";

					res.writeHead(200, {
						"Content-Type": "application/json; charset=utf-8",
						"Cache-Control": "no-cache, no-store, must-revalidate"
					});

					res.write(JSON.stringify(res_answer));
					res.end();

					console.log(post);

				} else {

					var question = parseInt(post["question"]);
					var answer = post["answer"];

					if ( question >= 0 && question < quiz.length ) {

						var usr = users_progress[cookies["username"]];

						if ( typeof usr != "undefined" ) {

							usr["answers"]["" + question] = answer;

							res_answer["status"] = "OK";
							res_answer["message"] = "Ni har svarat alternativ: " + answer + ". För att ändra svaret, uppdatera sidan.";

							res.writeHead(200, {
								"Content-Type": "application/json; charset=utf-8",
								"Cache-Control": "no-cache, no-store, must-revalidate"
							});

							res.write(JSON.stringify(res_answer));
							res.end();

							log_status_report();
							console.log("Team: " + cookies["username"] + ", answered: " + answer + ", on the question: " + question);

						} else {
							res_answer["status"] = "ERROR";
							res_answer["message"] = "unregistered user";

							res.writeHead(200, {
								"Content-Type": "application/json; charset=utf-8",
								"Cache-Control": "no-cache, no-store, must-revalidate"
							});

							res.write(JSON.stringify(res_answer));
							res.end();
						}

					} else {
						res_answer["status"] = "ERROR";
						res_answer["message"] = "Question out of bounds.. (" + question + "/" + quiz.length + ")";

						res.writeHead(200, {
							"Content-Type": "application/json; charset=utf-8",
							"Cache-Control": "no-cache, no-store, must-revalidate"
						});

						res.write(JSON.stringify(res_answer));
						res.end();
					}


				}

			});


		}

	} else if ( req.url == "/highscore" ) {
		// output the highscore 

		var user = cookies["username"];

		if ( user in users_progress ) {

			users_progress[user]["status"] = "HIGHSCORE";

		}

		res.writeHead(302, {
			'Location': '/'
		});
		res.end();

	} else {
		res.writeHead(302, {
			'Location': '/'
		});
		res.end();
	}


});

server.listen(port, hostname, () => {
	console.log(`Server running at http://${hostname}:${port}/`);
	console.log("Setting up the URL mapping for each question.");
	render_the_urls();
	console.log("URLs:");
	for ( var i = 0; i<quiz.length; i++ ) {
		console.log(`http://${hostname}:${port}` + quiz[i]["url"]);
	}


});