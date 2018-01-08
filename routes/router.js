import user from './user.js'
import robot from './robot.js'
import chat from './chat.js'

export default app => {
    // 注册几个路由
    app.use('/user', user)
    // app.use('/robot', robot)
    // app.use('/chat', chat)
}