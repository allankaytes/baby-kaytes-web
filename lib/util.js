const path = require("path");    
const fs = require('fs');
const util = require('util');

const overrideConsoleLog = () => {
    const log_file = fs.createWriteStream(path.join(__dirname, '..', 'debug.log'), {flags : 'w'});
    const log_stdout = process.stdout;
    
    console.log = function(d) { //
      log_file.write(util.format(d) + '\n');
      log_stdout.write(util.format(d) + '\n');
    }; 
}
module.exports = {
    overrideConsoleLog
}
