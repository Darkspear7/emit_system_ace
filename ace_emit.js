var Position = function (row, column){
    this.row = row;
    this.column = column;
}

var Ace_Emit = function (emit_system){
    this.system = emit_system;
    this.cursor_prev_p = new Position(0,0);
    this.cursor_current_p = new Position(0,0);
}

Ace_Emit.prototype.passChar = function (character){
    this.system.processChar(character);
}

Ace_Emit.prototype.updateCursor = function (cursor_position){
    this.cursor_prev_p = this.cursor_current_p;
    this.cursor_current_p = cursor_position;

    var moved_left = (this.cursor_current_p.column - this.cursor_prev_p.column) == -1;
    var moved_right = (this.cursor_current_p.column - this.cursor_prev_p.column) == 1;
    var moved_up = (this.cursor_current_p.row - this.cursor_prev_p.row) == -1;
    var moved_down = (this.cursor_current_p.row - this.cursor_prev_p.row) == 1;

    if(moved_left) this.system.cursorMoved("left");
    else if(moved_right) this.system.cursorMoved("right");
    else if(moved_up) this.system.cursorMoved("up");
    else if(moved_down) this.system.cursorMoved("down");
}

