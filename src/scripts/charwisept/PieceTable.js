var path = require('path');
const Piece = require((path.resolve(__dirname,'scripts/charwisept/Piece.js'))).Piece;
const PieceRange = require((path.resolve(__dirname,'scripts/charwisept/Piece.js'))).PieceRange;

class PieceTable {
    constructor(original){
        this.buffers = [ original ];
        this.pieceHead = new Piece(0, 0, original.length-1);
        this.pieceTail = this.pieceHead;
        this.undoStack = new Array();
        this.redoStack = new Array();
    }

    findPiece(charNo){
        if(charNo === 1){
            return [this.pieceHead, 0, -1];
        }
        let curChar = 1;
        let piece = this.pieceHead;
        while(piece!=null){
            let length = piece.end - piece.start + 1;
            if(length + curChar < charNo) {
                curChar+=length; 
                piece = piece.next; 
                continue;
            }
            if(length + curChar == charNo){
                return [piece, 2, -1];
            }
            return [piece, 1, piece.start + (charNo - curChar)]; // index just after the cut
        }
    }

    addText(text, charNo){
        // console.log(text.length, charNo);
        let newPiece = new Piece(this.buffers.length, 0, text.length - 1);
        this.buffers.push(text);
        let pieceCoordinate = this.findPiece(charNo);
        // console.log(charNo, pieceCoordinate);
        switch (pieceCoordinate[1]) {
            case 0:
                this.insertBeforePiece(newPiece, pieceCoordinate[0]);
                break;
            case 1:
                this.insertInBetweenPiece(newPiece, pieceCoordinate[0], pieceCoordinate[2]);
                break;
            case 2:
                this.insertAfterPiece(newPiece, pieceCoordinate[0]);
                break;
            default:
                break;
        }
        
    }

    insertAfterPiece(newPiece, piece, insertInUndo=true){
        
        newPiece.next = piece.next;
        if(newPiece.next) newPiece.next.prev = newPiece;
        else this.pieceTail = newPiece;
        piece.next = newPiece;
        newPiece.prev = piece;
        if(insertInUndo)
        this.pushUndo(new PieceRange(piece, newPiece.next, 1));
        // this.pieces.splice(indexOfPiece+1,0,newPiece);
    }

    insertBeforePiece(newPiece, piece){
        newPiece.next = this.pieceHead;
        this.pieceHead = newPiece;
        piece.prev = newPiece;
        this.pushUndo(new PieceRange(null, piece, 1));
        // this.pieces.splice(indexOfPiece,0,newPiece);
    }

    insertInBetweenPiece(newPiece, pieceToSplit, index){
        // index ke pehle insert karna hai
        let rightPiece = new Piece(pieceToSplit.bufferIndex, index, pieceToSplit.end);
        let pieceCopy = this.clone(pieceToSplit);
        this.pushUndo(new PieceRange(pieceCopy, pieceCopy, 0));
        pieceToSplit.end = index-1;
        this.insertAfterPiece(newPiece, pieceToSplit, false);
        this.insertAfterPiece(rightPiece, newPiece, false);
        // this.pieces.splice(indexOfPieceToSplit+1, 0, [newPiece,rightPiece]);
    }

    // deleteText(startCharNo, endCharNo){
    //     if(startCharNo === endCharNo) return;
    //     let startPieceCoordinate = this.findPiece(startCharNo);
    //     let endPieceCoordinate = this.findPiece(startCharNo);   
    //     if(startPieceCoordinate[0] === endPieceCoordinate[0]){ 
    //         let piece = endPieceCoordinate[0];
    //         let pieceCopy = clone(piece);
    //         this.pushUndo(new PieceRange(pieceCopy, pieceCopy, 0));
    //         if(startPieceCoordinate[1]===0){
    //             if(endPieceCoordinate[1]===2){
    //                 this.pieceHead = piece.next;
    //                 if(piece.next) piece.next.prev = null;
    //                 return;
    //             }
    //             piece.start = endPieceCoordinate[2]+1;
    //             return;
    //         }  
    //         if(endPieceCoordinate[1]===2){
    //             piece.end = startPieceCoordinate[2]-1;
    //             return;
    //         }            
    //         let newPiece = new Piece(piece.bufferIndex, endPieceCoordinate[2]+1, piece.end, piece, piece.next);
    //         piece.end = startPieceCoordinate[2]-1;
    //         this.insertAfterPiece(newPiece, piece);
    //         piece.start = endPieceCoordinate[2]+1;
    //         return;
    //     }
    //     if(startPieceCoordinate[1]===0){
    //         this.pieceHead = endPieceCoordinate[0];
    //         endPieceCoordinate[0].prev = null;
    //     }
    //     else{
    //         startPieceCoordinate[0].next = endPieceCoordinate[0];
    //         endPieceCoordinate[0].prev = startPieceCoordinate[0];
    //     }

    //     if(startPieceCoordinate[1]==1){
    //         startPieceCoordinate[0].end = startPieceCoordinate[2]-1;
    //     } 
    //     if(endPieceCoordinate[1]==1){
    //         endPieceCoordinate[0].start = endPieceCoordinate[2];
    //     } 
    // }

    deleteText(startCharNo, endCharNo){ // [startCharNo, endCharNo] inclusive delete 
        // console.log(startCharNo, endCharNo);
        if(startCharNo > endCharNo) return;
        let startPieceCoordinate = this.findPiece(startCharNo);
        let endPieceCoordinate = this.findPiece(endCharNo);  
        // console.log(startPieceCoordinate[0],startPieceCoordinate[1],startPieceCoordinate[2]);
        // console.log(endPieceCoordinate[0],endPieceCoordinate[1],endPieceCoordinate[2]);
        let piece = startPieceCoordinate[0];
        let startPiece = startPieceCoordinate[0], endPiece = endPieceCoordinate[0];
        if(startPieceCoordinate[1]===0){
            startPiece = startPiece.prev;
        }
        else if(startPieceCoordinate[1]===1){
            startPiece = new Piece(piece.bufferIndex, piece.start, startPieceCoordinate[2]-1, piece.prev, null);
            if(startPiece.prev) startPiece.prev.next = startPiece;
            else this.pieceHead = startPiece;

        }
        else if(startPieceCoordinate[1]===2) {
            piece=piece.next;
            startPiece = startPiece.next;
        }
        
        while(piece != endPieceCoordinate[0] && piece!=null){
            piece = piece.next;
        } 
        if(endPieceCoordinate[1]===1){
            
            endPiece = new Piece(endPieceCoordinate[0].bufferIndex, endPieceCoordinate[2], endPieceCoordinate[0].end, null, endPieceCoordinate[0].next);
            if(endPiece.next) endPiece.next.prev = endPiece;
            else this.pieceTail = endPiece;
        }
        else if(endPieceCoordinate[1]===2){
            endPiece = endPiece.next;
        }
        let pieceRange = new PieceRange(piece, endPieceCoordinate[0], 0);
        if(startPiece) startPiece.next = endPiece;
        else{
            this.pieceHead = endPiece;
        }
        if(endPiece) endPiece.prev = startPiece;  
        else{
            this.pieceTail = startPiece;
        }    
        this.pushUndo(pieceRange);
    }

    // constructFinalDocument(){
    //     let fileDescriptor = fd;
    //     fs.open("mynewfile1.txt", "w", function(err, fd){
    //         if(err) console.log(err);
    //         console.log("File opened")
    //     });
    //     let posInFile=0;
    //     let piece = this.pieceHead;
    //     while(piece){
    //         let length = piece.end - piece.start + 1;
    //         fs.write(Buffer(this.buffers[piece.bufferIndex]), piece.start, length, posInFile);
    //         posInFile+=length;
    //         piece = piece.next;
    //     }
    //     fs.close(fd);
    // }

    
    applyUndoRedo(lastEdit){
        console.log("#");
        let newRange = new PieceRange();
        if(!lastEdit.pieceRangeType){
            let prevPiece = lastEdit.first.prev;
            let nextPiece = lastEdit.last.next;
            if(prevPiece){
                newRange.first = prevPiece.next;
                prevPiece.next = lastEdit.first;
            }
            else{
                newRange.first = this.pieceHead;
                this.pieceHead = lastEdit.first;
            }

            if(nextPiece){
                newRange.last = nextPiece.prev;
                nextPiece.prev = lastEdit.last;
            }
            else{
                newRange.last = this.pieceTail;
                this.pieceTail = lastEdit.last;
            }
            
        }
        else{
            console.log(lastEdit);
            if(lastEdit.first){
                newRange.first = lastEdit.first.next;
                lastEdit.first.next = lastEdit.last;
            }
            else{
                newRange.first = this.pieceHead;
                this.pieceHead = lastEdit.last;
            }

            if(lastEdit.last){
                newRange.last = lastEdit.last.prev;
                lastEdit.last.prev = lastEdit.first;
            }
            else{
                newRange.last = this.pieceTail;
                this.pieceTail = lastEdit.first;
            }
        }
        return newRange;
        
    }
    applyUndo(){
        console.log("#w");
        if(!this.undoStack.length) {
            console.log("Empty Undo Stack");
            return false;
        }
        let lastEdit = this.undoStack[this.undoStack.length-1];
        let newRange = this.applyUndoRedo(lastEdit);
        this.popUndo();
        this.pushRedo(newRange);
    }

    applyRedo(){
        if(!this.redoStack.length) {
            console.log("Empty Redo Stack");
            return false;
        }
        let lastEdit = this.redoStack[this.redoStack.length-1];
        let newRange = this.applyUndoRedo(lastEdit);
        this.popRedo();
        this.pushUndo(newRange);
    }

    popUndo(){
        if(this.undoStack.length) this.undoStack.pop();
    }

    popRedo(){
        if(this.redoStack.length) this.redoStack.pop();
    }

    pushUndo(pieceRange){
        if(this.undoStack.length==10) this.undoStack.shift();
        this.undoStack.push(pieceRange);
        console.log(this.undoStack.length);
    }
    pushRedo(pieceRange){
        if(this.redoStack.length==10) this.redoStack.shift();
        this.redoStack.push(pieceRange);
        console.log(this.redoStack.length);
    }

    clone(piece){
        return new Piece(piece.bufferIndex, piece.start, piece.end, piece.prev, piece.next);
    }



}