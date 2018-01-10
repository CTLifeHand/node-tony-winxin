

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var index = require('./routes/index');
// var users = require('./routes/users');

import config from 'config-lite';
import session from 'express-session';
import connectMongo from 'connect-mongo';
import router from './routes/router.js';

// 业务
import db from './mongodb/db.js';
import dtime from 'time-formater'
import IDModel from './models/id.js'
import ChatModel from './models/chat.js'
import UserModel from './models/user.js'


import history from 'connect-history-api-fallback';

var app = express();
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// DB
const MongoStore = connectMongo(session);
app.use(session({
  	name: config.session.name,
		secret: config.session.secret,
		resave: true,
		saveUninitialized: false,
		cookie: config.session.cookie,
		store: new MongoStore({
	  	url: config.url
	})
}))


// 业务逻辑
app.all('*', (req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin);
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Credentials", true); //可以带cookies
  res.header("X-Powered-By", '3.2.1')
  if (req.method == 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});


app.use('/', index);
// app.use('/users', users);

router(app)

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


var debug = require('debug')('node-tony-winxin:server');
var http = require('http');

/**
 * Get port from environment and store in Express.
 */

var port = normalizePort(process.env.PORT || config.port);
app.set('port', port);

/**
 * Create HTTP server.
 * 用下面的方法去创建server
 */

// var server = http.createServer(app);

const server = http.Server(app);

/**
 * socket 
 */
const io = require('socket.io')(server);
const users = {};
io.on('connection', socket => {
  // console.log(socket);
  console.log('a user connected')
  socket.on("chat", async (msg) => {
    let { user_id, content } = msg;
    content = content.trim();
    try {
      if (!user_id) {
        throw new Error('用户ID参数错误')
      } else if (!content) {
        throw new Error('发表对话信息错误')
      }
    } catch (err) {
      console.log(err.message, err);
    }
    content = content.substring(0, 100);
    let chatObj;
    try {
      const user = await UserModel.findOne({ id: user_id });
      const ID = await IDModel.findOne()
      ID.chat_id++;
      await ID.save()
      chatObj = {
        id: ID.chat_id,
        username: user.name,
        avatar: user.avatar,
        user_id,
        time: dtime().format('YYYY-MM-DD HH:mm:ss'),
        content,
      }
      await ChatModel.create(chatObj)
    } catch (err) {
      console.log('保存聊天数据失败', err);
    }
    io.emit("chat", chatObj);
  });
  // 这里要看前端怎么提交东西上来
  socket.on('chat message', function (msg) {
    console.log('message: ' + msg);
    io.emit("chat message", '我自己会收到吗'); // 只有其他人会收到
  });

  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
});

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}

app.use(history()); // 这个不知道有啥用
module.exports = app;
