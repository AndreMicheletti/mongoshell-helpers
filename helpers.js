DB.prototype.opKiller = function() {
  db.aggregate([
    {"$currentOp": { "allUsers": true, "idleConnections": true }},
    {"$match": {
      "opid": {
        "$exists": true
      }
    }},
    {"$project": {
      "opid": 1
    }}
  ]).forEach(({opid}) => db.killOp(opid))
};

DB.prototype.changeProfileSize = function(newSize = 4000000) {
  db.setProfilingLevel(0);
  db.system.profile.drop();
  db.createCollection( "system.profile", { 'capped': true, 'size': newSize } );
  db.setProfilingLevel(1);
};

DB.prototype.seeSlowOperations = function(limit = 1000) {
  db.system.profile.aggregate([
    {"$match": {
        "op": { "$ne" : 'command' },
        "nreturned": {"$gt": 0}
    }},
    {"$project": {
        "op": 1,
        "ns": 1,
        "command": 1,
        "keysExamined": 1,
        "docsExamined": 1,
        "nreturned": 1,
        "responseLength": 1,
        "millis": 1,
        "planSummary": 1,
        "execStats": 1,
        "ts": 1,
        "queryTargeting": { "$divide": ["$docsExamined", "$nreturned"]}
    }},
    {"$match": {
        "queryTargeting": { "$gt": 1 }
    }},
    {"$sort": { "queryTargeting": -1 }},
    {"$limit": limit}
  ]).pretty()
}
