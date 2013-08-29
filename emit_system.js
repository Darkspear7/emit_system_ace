function debug (string){
    console.log(string);
}

var Atom = function (type, data = undefined, left = undefined, right = undefined){
    this.type = type; 
    this.left = left;
    this.right = right;
    this.data = data;
}

Atom.prototype.append_end = function (atom){
    this.data += atom.data;
}

Atom.prototype.append_begin = function (atom){
    this.data = atom.data + this.data;
}

Atom.prototype.length = function (){
    if(this.data == undefined){
        return -1;
    }
    return this.data.length;
}

Atom.prototype.remove = function (position){
    if(position == 0){
        this.data = data.slice(1);
    } else {
        var data_part_1 = this.data.slice(0, position);
        var data_part_2 = this.data.slice(position + 1);
        this.data = data_part_1 + data_part_2;
    }
}

Atom.prototype.removeHead = function (){
    this.data = this.data.slice(1);
    if(this.data.length < 1){ 
        // if you remove the atom you have to check if right is the
        // same type as left and if so merge them
        if(this.left.type == this.right.type){
            this.left.data += this.right.data;
            this.left.right = this.right.right;
            this.right.left = this.left;
        } else {
            // remove the atom from the chain
            this.left.right = this.right;
            this.right.left = this.left;
        }
    }
}

Atom.prototype.removeTail = function (){
    this.data = this.data.slice(0, -1);
    if(this.data.length < 1){
        // remove the atom from the chain
        this.left.right = this.right;
        this.right.left = this.left;
    }
}

var Cursor = function (){
    this.left_atom = undefined;
    this.right_atom = undefined;
    this.current_atom = undefined;
    this.inside_atom = false;
    this.atom_position = 0;
}

Cursor.prototype.addLeft = function (atom){
    this.left_atom.right = atom;
    atom.left = this.left_atom;
    atom.right = this.right_atom;
    this.right_atom.left = atom;
    this.left_atom = atom;
}

Cursor.prototype.addRight = function (atom){
    this.right_atom.left = atom;
    atom.right = this.right_atom;
    atom.left = this.left_atom;
    this.left_atom.right = atom;
    this.right_atom = atom;

}

Cursor.prototype.at_end = function (){
    return this.right_atom.type == "eof" ? true : false;
}

Cursor.prototype.at_start = function (){
    return this.left_atom.type == "bof" ? true : false;
}

Cursor.prototype.appendLeft = function (atom){
    this.left_atom.append_end(atom);
}

Cursor.prototype.removeChar = function (){
    // have to remove the right character because of how ace work
    // Ace triggers changeCursor first and then change for backspace
    // inverse for input characters
    if(this.inside_atom){
        // this mean that either you are on the last position and need
        // to delete the last element
        if(this.atom_position == this.current_atom.length() - 1){
            this.current_atom.removeTail();
            if(this.current_atom.length() > 0){
                this.left_atom = this.current_atom;
            } else {
                this.left_atom = this.current_atom.left;
            }
            this.current_atom = undefined;
            this.inside_atom = false;
        } else {
            // or that you are inside and need to delete the right element
            this.current_atom.remove(this.atom_position);
        }
    } else {
        // this mean that you we're inside an atom and need to delete the begining
        // store left atom length in case of a merge
        var left_length = this.left_atom.length();
        // l - c - r - rr
        // in case we delete r we merge rr with l
        var merged = this.left_atom.type == this.right_atom.right.type;

        this.right_atom.removeHead();
        if(this.right_atom.length() == 0){
            if(merged){
                this.inside_atom = true;
                // because merge is done to the left
                this.current_atom = this.left_atom;
                this.left_atom = this.current_atom.left;
                this.atom_position = left_length;
            } else {
                this.right_atom = this.right_atom.right;
            }
        } 
    }
}

Cursor.prototype.appendRight = function (atom){
    this.right_atom.append_begin(atom);
    this.current_atom = this.right_atom;
    this.right_atom = this.current_atom.right;
    this.inside_atom = true;
    this.atom_position = atom.length();
}

Cursor.prototype.splitCurrent = function(){
    var atom_a_data = this.current_atom.data.substr(0, this.atom_position);
    var atom_b_data = this.current_atom.data.substr(this.atom_position, this.current_atom.length());   
    var type = this.current_atom.type; 

    var atom_a = new Atom(type, atom_a_data);
    var atom_b = new Atom(type, atom_b_data);
   
    this.addRight(atom_b);
    this.addLeft(atom_a);  
    
    this.current_atom = undefined;
    this.inside_atom = false;

}

Cursor.prototype.mergeWith = function (atom){
    var pos = this.left_atom.length() + atom.length();

    atom.append_begin(this.left_atom);
    atom.append_end(this.right_atom);
    
    this.inside_atom = true;
    this.current_atom = atom;
    this.atom_position = pos;

    this.left_atom = this.left_atom.left;
    this.left_atom.right = this.current_atom;
    this.current_atom.left = this.left_atom;

    this.right_atom = this.right_atom.right;
    this.right_atom.left = this.current_atom;
    this.current_atom.right = this.right_atom;
}

Cursor.prototype.addInside = function (atom){
    var atom_a_data = this.current_atom.data.substr(0, this.atom_position);
    var atom_b_data = this.current_atom.data.substr(this.atom_position, this.current_atom.length());   
    var type = this.current_atom.type;
    
    if(atom.type == type){
        this.current_atom.data = atom_a_data + atom.data + atom_b_data;
    }

    var atom_a = new Atom(type, atom_a_data);
    var atom_b = new Atom(type, atom_b_data);
    
    if(atom.type == type){
        
    }
    this.addRight(atom_b);
    if(atom.type == atom_a.type){
        atom_a.append_end(atom);
        this.addLeft(atom_a);
    } else {
        this.addLeft(atom_a);
        this.addLeft(atom);
    }
    this.current_atom = undefined;
    this.inside_atom = false;
}

// check at start
Cursor.prototype.movedLeft = function (){
    if(this.inside_atom == false){
        if(this.left_atom.type == "bof") return;
        if(this.left_atom.length() > 1){
            // you go inside that one
            this.inside_atom = true;
            this.current_atom = this.left_atom;
            this.left_atom = this.current_atom.left;

            this.atom_position = this.current_atom.length() - 1;
        } else {
            // you jump over it
            // explanations at movedRight
            this.right_atom = this.left_atom;
            this.left_atom = this.right_atom.left;
        }
    } else /*cursor is inside an atom*/ {
        // cursor is/was inside an atom
        this.atom_position -= 1; 
        if(this.atom_position > 0){
            // still inside, don't think there is anything to do
        }
        else if(this.atom_position == 0){
            // is at the left limit, set as outisde
            this.left_atom = this.current_atom.left;
            this.right_atom = this.current_atom;
            this.inside_atom = false;
            this.current_atom = undefined;
        }
        else {
            alert ("cursor moved right and shit happened");
        }
    }
}
// check at end
Cursor.prototype.movedRight = function (){
    if(this.inside_atom == false){
        if(this.right_atom.type == "eof") return;
        // check legngth of atom to the right to know if you jump over
        // or on inside
        if(this.right_atom.length() > 1){
            // you go inside that one
            this.inside_atom = true;
            this.current_atom = this.right_atom;
            this.right_atom = this.current_atom.right;

            this.atom_position = 1;
        } else {
            // you jump over it
            this.left_atom = this.right_atom;
            this.right_atom = this.left_atom.right;
            // i consider explications is need for the above two lines
            // (1) we set the left atom reference to the right atom so that is like this
            // l - c - r - rr
            // r - c - r
            // (2) then we set the right atom as being the left's (previous right) right
            // r - c - r
            // r - c - rr
        }
    } else /*cursor is inside an atom*/ {
        // cursor is/was inside an atom
        this.atom_position += 1;
        if(this.atom_position < this.current_atom.length()){
            // still inside, don't think there is anything to do
        }
        else if(this.atom_position == this.current_atom.length()){
            // is at the right limit, set as outisde
            this.left_atom = this.current_atom;
            this.right_atom = this.current_atom.right;
            this.inside_atom = false;
            this.current_atom = undefined;
        }
        else {
            alert ("cursor moved right and shit happened");
        }
    }
    
}

var Buffer = function (){
    this.content_type = "null";
    this.content = "";
}

Buffer.prototype.is_empty = function (){
    return this.content.length > 0 ? false : true;
}

Buffer.prototype.clear = function (){
    this.content_type = "null";
    this.content = "";
}

var EmitSystem = function emit_system (){
    this.cursor = new Cursor();
    this.buffer = new Buffer();
    
    this.move_by_add = false; 
    this.move_by_del = false;

    var tmp_eof_atom = new Atom ("eof");
    var tmp_bof_atom = new Atom ("bof");
    tmp_eof_atom.left = tmp_bof_atom;
    tmp_bof_atom.right = tmp_eof_atom;
    this.cursor.right_atom = tmp_eof_atom;
    this.cursor.left_atom = tmp_bof_atom;
}

EmitSystem.prototype._atom_from_buffer = function (){
    var tmp_atom = new Atom (this.buffer.content_type);
    tmp_atom.data = this.buffer.content; 
    this.buffer.clear ();
    return tmp_atom;   
}

EmitSystem.prototype._cursor_atom_check = function(){
    var tmp_atom = this._atom_from_buffer();
    // check if cursor is inside an atom
    if(this.cursor.inside_atom){
        // here it gets intresting
        this.cursor.splitCurrent();
        if(this.cursor.left_atom.type == tmp_atom.type && this.cursor.right_atom.type == tmp_atom.type){
            this.cursor.mergeWith(tmp_atom);
        }
        else if(this.cursor.left_atom == tmp_atom.type){
            this.cursor.appendLeft(tmp_atom);
        }
        else if(this.cursor.right_atom == tmp_atom.type){
            this.cursor.appendRight(tmp_atom);
        }
        else {
            this.cursor.addLeft(tmp_atom);
        }
    } else {
        if(tmp_atom.type == this.cursor.left_atom.type){
           // merge atom to the left atom
            this.cursor.appendLeft(tmp_atom);
        }
        else if(tmp_atom.type == this.cursor.right_atom.type){
            // merge atom to the right atom
            this.cursor.appendRight(tmp_atom);
        }
        else {
            this.cursor.addLeft(tmp_atom); 
        }
    }
}

EmitSystem.prototype._cursor_left = function (){
    if(this.buffer.is_empty()){
        // navigation
        this.cursor.movedLeft();
    } else /*if buffer isn't empty*/{
        // create atom from buffer
        this._cursor_atom_check ();
        this.cursor.movedLeft(); 
    }

}

EmitSystem.prototype._cursor_right = function (){
    if(this.buffer.is_empty()){
        // it's most likely navifation
        // cusor moved right  
        this.cursor.movedRight();
    } else {
        // create atom from buffer
        this._cursor_atom_check ();
        this.cursor.movedRight();
    }
}

EmitSystem.prototype.cursorMoved = function (direction){ 
    if(this.move_by_add){
        this.move_by_add = false;
        return;
    }
    // not used because i can't test if user pressed backspace
    // before cursor changes...
    if(this.move_by_del){
        this.move_by_del = false;
    }

    if(direction == "left"){
        this._cursor_left ();
    }
    else if(direction == "right"){
        this._cursor_right ();
    }
    else if(direction == "up"){
        alert ("direction up not implemented");
    }
    else if(direction == "down"){
        alert ("direction down not implemented");
    }
    else {
        alert("this is not a valid direction"); 
    }
}

function _char_to_symbol (character){
    var word_delim = [" "];
    var word_comp = ["*"];
    var compare = function(element, index, array){
        return element == character;
    };
    if(word_delim.some(compare)){
        return "space";
    }
    else if(word_comp.some(compare)){
        return "star";
    }
    else {
        return "word";
    }
}

EmitSystem.prototype.removeChar = function (){
    this.cursor.removeChar ();
}

EmitSystem.prototype.processChar = function (character){
    this.move_by_add = true;
    var char_type = _char_to_symbol (character);
    if(this.buffer.is_empty()){
        this.buffer.content_type = char_type;
        this.buffer.content += character;
    } else {
        if(this.buffer.content_type == char_type){
            this.buffer.content += character;
        } 
        else if(this.buffer.content_type != char_type){
            // is the character is of a diffrente type than the ones in the buffer
            // create atom
            // check if left atom or right atom is the same type
            var tmp_atom = this._atom_from_buffer();
            // check if cursor inside an atom
            if(this.cursor.inside_atom){
               //this.cursor.addInside(tmp_atom);
               //
               this.cursor.splitCurrent();
                if(this.cursor.left_atom.type == tmp_atom.type){
                    this.cursor.appendLeft(tmp_atom);
                } else {
                    this.cursor.addLeft(tmp_atom);
                }
            } else {
                // perform operations for the case when cursor is not inside an atom
                if(this.cursor.left_atom.type == tmp_atom.type){
                    // add new atom to the left atom
                    this.cursor.appendLeft(tmp_atom);
                } else if(this.cursor.right_atom.type == tmp_atom.type){
                    // add new atom to the right atom
                    this.cursor.appendRight(tmp_atom);
                } else {
                    this.cursor.addLeft(tmp_atom);
                }
            }
            this.buffer.content_type = char_type;
            this.buffer.content += character;
        }
   }
}

EmitSystem.prototype.setCursor = function EmitSystem_setCursor (cursor_position){
    var dif_col = this.cursor.position.column - cursor_position.column;
    var dif_row = this.cursor.position.row - cursor_position.row;

    console.clear();
    console.log(this.cursor.position);
    console.log(cursor_position);
    if( dif_col > 1 || dif_col < -1 || dif_row > 1 || dif_row < -1) 
        alert("Cursor jumping is not supported for now.\nRefresh the page or face the BUG-valanche !");

    if(this.state == "linear"){
        // check new position state
        if( dif_col == 1){
            // mouse moved left
            // clear buffer if not empty
            if(this.buffer != ""){
                if(this.buffer_content == "space"){
                    var tmp_atom = new Atom ("space", this.buffer_start);
                    tmp_atom.data = this.buffer;
                    //this.cursor.setLeft(tmp_atom);
                    this.buffer = "";
                    this.buffer_content = "";
                    if( tmp_atom.length() > 1){
                        this.cursor.addLeft(tmp_atom);
                        // inside atom
                        this.cursor.insideLeft ();
                    } else {
                        this.cursor.addRight(tmp_atom);
                    }
                }
                else if(this.buffer_content == "word"){
                    var tmp_atom = new Atom ("word", this.buffer_start);
                    tmp_atom.data = this.buffer;
                    //this.cursor.setLeft(tmp_atom);
                    this.buffer = "";
                    this.buffer_content = "";
                    if( tmp_atom.length() > 1){
                        this.cursor.addLeft(tmp_atom);
                        // inside atom
                        this.cursor.insideLeft ();
                    } else {
                        this.cursor.addRight(tmp_atom);
                    }
                }
            } else {
                this.cursor.insideLeft ();
            }
        this.state = "navigation";
        }
        this.cursor.position = cursor_position;
    }
    else if(this.state == "navigation"){
        if(dif_col == 1){
            // mouse moves left
            console.log("nav left");
            this.cursor.position = cursor_position;
            this.cursor.moveLeft ();
        }
        else if(dif_col == -1){
            // nouse moves right
        }
    }
    else if(this.state == "lrm"){
    }
    else if(this.state == "lre"){
    }
    else {
        // shit is fucked up
    }
}

EmitSystem.prototype.printAtoms = function (){
    var tmp_atom = this.cursor.left_atom;
    while(tmp_atom.type != "bof"){
        tmp_atom = tmp_atom.left;
    }
    //debug(tmp_atom); 
    str = "";
    while(tmp_atom.type != "eof"){
        str += tmp_atom.type;
        if(tmp_atom.position != undefined){
            str += ":" + tmp_atom.position.row + "," + tmp_atom.position.column;
        }
        if(tmp_atom.data != undefined){
            str += "(" + tmp_atom.data + ")";
        }
        str += " ";
        
        tmp_atom = tmp_atom.right;
    }
    str += tmp_atom.type + " ";
    return str;
}

EmitSystem.prototype.process_Char = function (character){
    if(this.state == "linear"){
        if(key == " "){
            if(this.buffer_content == ""){
                this.buffer_content = "space";
                this.buffer_start = this.cursor.position;
                this.buffer += key;
            }
            else {
                if(this.buffer_content == "space"){
                    this.buffer += key;
                }
                else if(this.buffer_content == "word"){
                    // user data in buffer
                    var tmp_atom = new Atom ("word", this.buffer_start);
                    tmp_atom.data = this.buffer;
                    this.cursor.addLeft(tmp_atom);
                    this.buffer = "";
                    this.buffer += key;
                    this.buffer_content = "space";
                    this.buffer_start = this.cursor.position;
                }
            }
        }
        else {
            if(this.buffer_content == ""){
                this.buffer_content = "word";
                this.buffer_start = this.cursor.position;
                this.buffer += key;
            }
            else{
                if(this.buffer_content == "word"){
                    this.buffer += key;
                }
                else {
                    var tmp_atom = new Atom ("space", this.buffer_start);
                    tmp_atom.data = this.buffer;
                    this.cursor.addLeft(tmp_atom);
                    this.buffer = "";
                    this.buffer += key;
                    this.buffer_content = "word";
                    this.buffer_start = this.cursor.position;
                }
            }
        }
    }
    else {
        
    }
}
