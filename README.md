# About

This is a Node.js app made for a quiz-walk at a party. It was made by me and my partner for our 25st birtday party.

# Modify 

The questions are provided in the "quiz.js" file. Feel free to modify them, add more, and 
use this app at your own party! 

Also, there are some messages in swedish outputted from the server and written directly to the page. This can be editted also, 
for example in: 

<pre>
				answer["status"] = "OK";
				answer["state"] = "QUIZ";
				answer["message"] = user + " har hittat en quiz-fråga!";
</pre>
, you may here change the answer["message"] field, it is what is printed out, to something like "user + has found a quiz-question!".  

# Install

Install [Node.js](https://nodejs.org/en/) and launch the app with: 
<pre>
node app.js
</pre>

Edit the variables in app.js:
<pre>
const hostname = 'insert your IP';
const port = 'insert your port';
</pre>

Configure your router, if you are using a NAT router, to [forward all requests](https://en.wikipedia.org/wiki/Port_forwarding) to your machine. This is typically done using the router interface after logging in.
