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
  return `Done. db.system.profile new size is ${newSize}`;
};

DB.prototype.showInefficientOps = function(limit = 1000) {
  db.setSlaveOk();
  return db.system.profile.aggregate([
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
    {"$limit": limit},
    {"$group": {
        "_id": "$ns",
        "commands": { "$addToSet": {
            "op": "$op",
            "ns": "$ns",
            "command": "$command",
            "keysExamined": "$keysExamined",
            "docsExamined": "$docsExamined",
            "nreturned": "$nreturned",
            "responseLength": "$responseLength",
            "millis": "$millis",
            "planSummary": "$planSummary",
            "execStats": "$execStats",
            "ts": "$ts",
            "queryTargeting": "$queryTargeting"
        }}
    }}
  ]).pretty()
}

DB.prototype.showSlowerThan = function(slower, limit = 100) {
  db.setSlaveOk();
  return db.system.profile.aggregate([
    {"$match": {
        "op": { "$ne" : 'command' },
        "nreturned": {"$gt": 0},
        "millis": {"$gte": slower}
    }},
    {"$limit": limit},
    {"$group": {
        "_id": "$ns",
        "totalMillis": {"$sum": "$millis"},
        "commands": { "$addToSet": {
            "op": "$op",
            "ns": "$ns",
            "command": "$command",
            "keysExamined": "$keysExamined",
            "docsExamined": "$docsExamined",
            "nreturned": "$nreturned",
            "responseLength": "$responseLength",
            "millis": "$millis",
            "planSummary": "$planSummary",
            "execStats": "$execStats",
            "ts": "$ts",
            "queryTargeting": "$queryTargeting"
        }}
    }},
    {"$sort": { "totalMillis": -1 }},
  ])
}
