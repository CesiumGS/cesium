importPackage(java.sql);
java.lang.Class.forName('org.sqlite.JDBC');

var DB = exports.DB = function(dbname) {
    this.dbname = dbname;
}

DB.prototype.connect = function() {
    this.conn = DriverManager.getConnection('jdbc:sqlite:' + this.dbname);
    return this;
}
          
DB.prototype.prepare = function(statement) { // like "insert into symbols values (?, ?, ?);"
    this.prep = this.conn.prepareStatement(statement);
    return this;
}

DB.prototype.values = function() { // replaces "?" placeholders in prepared statement
    for (var i = 0, leni = arguments.length; i < leni; i++) {
        this.prep.setString(i+1, arguments[i]);
    }
    this.prep.addBatch();
    
    return this;
}

DB.prototype.commit = function() {
    this.conn.setAutoCommit(false);
    this.prep.executeBatch();
    this.conn.setAutoCommit(true);
    
    return this;
}

DB.prototype.query = function(statement) { // like "select * from symbols;"
    this.stat = this.conn.createStatement();
    this.resultSet = this.stat.executeQuery(statement);
    
    return this.resultSet;
}

DB.prototype.update = function(statement) { // like "create table symbols (id, longname, kind);"
    this.stat = this.conn.createStatement();
    this.resultSet = this.stat.executeUpdate(statement);
    
    return this;
}

DB.prototype.close = function() {
    if (this.resultSet) this.resultSet.close();
    if (this.stat) this.stat.close();
    if (this.conn) this.conn.close();
    
    return this;
}
