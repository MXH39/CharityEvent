// event_db.js  
const mysql = require('mysql2');
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'charityevents_db'
});
db.connect((err) => {
    if(err){
        console.log("DB connect fail：",err);
        return;
    }
    console.log("charityevents_db connected");
});
module.exports = db;
