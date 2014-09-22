var transfuser = require('../index.js');

var configList = [
    "$/basic.config.json",
    "configs/config1.js",
    "configs/config2.json"
];

console.log("---------------------------");
var sConfigs = transfuser().loadSync(configList);
console.log("Sync Loaded Configs:", JSON.stringify(sConfigs, null, 2));

console.log("---------------------------");
transfuser()
    .load(configList)
    .then(function(aConfigs){
        console.log("ASync Loaded Configs:", JSON.stringify(aConfigs, null, 2));
    });
