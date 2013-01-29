// AMD-ID "dojox/math/matrix"
define(["dojo", "dojox"], function(dojo, dojox) {
dojo.getObject("math.matrix", true, dojox);

dojo.mixin(dojox.math.matrix, {
	iDF:0,
	ALMOST_ZERO: 1e-10,
	multiply: function(/* Array */a, /* Array */b){
		// summary:
		//		Multiply matrix a by matrix b.
		var ay=a.length, ax=a[0].length, by=b.length, bx=b[0].length;
		if(ax!=by){
			console.warn("Can't multiply matricies of sizes " + ax + "," + ay + " and " + bx + "," + by);
			return [[0]];
		}
		var c=[];
		for (var k=0; k<ay; k++) {
			c[k]=[];
			for(var i=0; i<bx; i++){
				c[k][i]=0;
				for(var m=0; m<ax; m++){
					c[k][i]+=a[k][m]*b[m][i];
				}
			}
		}
		return c;	// Array
	},
	product: function(/* Array... */){
		// summary:
		//		Return the product of N matrices
		if (arguments.length==0){
			console.warn("can't multiply 0 matrices!");
			return 1;
		}
		var m=arguments[0];
		for(var i=1; i<arguments.length; i++){
			m=this.multiply(m, arguments[i]);
		}
		return m;	// Array
	},
	sum: function(/* Array... */){
		// summary:
		//		Return the sum of N matrices
		if(arguments.length==0){
			console.warn("can't sum 0 matrices!");
			return 0;	// Number
		}
		var m=this.copy(arguments[0]);
		var rows=m.length;
		if(rows==0){
			console.warn("can't deal with matrices of 0 rows!");
			return 0;
		}
		var cols=m[0].length;
		if(cols==0){
			console.warn("can't deal with matrices of 0 cols!");
			return 0;
		}
		for(var i=1; i<arguments.length; ++i){
			var arg=arguments[i];
			if(arg.length!=rows || arg[0].length!=cols){
				console.warn("can't add matrices of different dimensions: first dimensions were " + rows + "x" + cols + ", current dimensions are " + arg.length + "x" + arg[0].length);
				return 0;
			}
			for(var r=0; r<rows; r++) {
				for(var c=0; c<cols; c++) {
					m[r][c]+=arg[r][c];
				}
			}
		}
		return m;	// Array
	},
	inverse: function(/* Array */a){
		// summary:
		//		Return the inversion of the passed matrix
		if(a.length==1 && a[0].length==1){
			return [[1/a[0][0]]];	// Array
		}
		var tms=a.length, m=this.create(tms, tms), mm=this.adjoint(a), det=this.determinant(a), dd=0;
		if(det==0){
			console.warn("Determinant Equals 0, Not Invertible.");
			return [[0]];
		}else{
			dd=1/det;
		}
		for(var i=0; i<tms; i++) {
			for (var j=0; j<tms; j++) {
				m[i][j]=dd*mm[i][j];
			}
		}
		return m;	// Array
	},
	determinant: function(/* Array */a){
		// summary:
		//		Calculate the determinant of the passed square matrix.
		if(a.length!=a[0].length){
			console.warn("Can't calculate the determinant of a non-squre matrix!");
			return 0;
		}
		var tms=a.length, det=1, b=this.upperTriangle(a);
		for (var i=0; i<tms; i++){
			var bii=b[i][i];
			if (Math.abs(bii)<this.ALMOST_ZERO) {
				return 0;	// Number
			}
			det*=bii;
		}
		det*=this.iDF;
		return det;	// Number
	},
	upperTriangle: function(/* Array */m){
		// summary:
		//		Find the upper triangle of the passed matrix and return it.
		m=this.copy(m);
		var f1=0, temp=0, tms=m.length, v=1;
		this.iDF=1;
		for(var col=0; col<tms-1; col++){
			if(typeof m[col][col]!="number") {
				console.warn("non-numeric entry found in a numeric matrix: m[" + col + "][" + col + "]=" + m[col][col]);
			}
			v=1;
			var stop_loop=0;
			while((m[col][col] == 0) && !stop_loop){
				if (col+v>=tms){
					this.iDF=0;
					stop_loop=1;
				}else{
					for(var r=0; r<tms; r++){
						temp=m[col][r];
						m[col][r]=m[col+v][r];
						m[col+v][r]=temp;
					}
					v++;
					this.iDF*=-1;
				}
			}
			for(var row=col+1; row<tms; row++){
				if(typeof m[row][col]!="number"){
					console.warn("non-numeric entry found in a numeric matrix: m[" + row + "][" + col + "]=" + m[row][col]);
				}
				if(typeof m[col][row]!="number"){
					console.warn("non-numeric entry found in a numeric matrix: m[" + col + "][" + row + "]=" + m[col][row]);
				}
				if(m[col][col]!=0){
					var f1=(-1)* m[row][col]/m[col][col];
					for (var i=col; i<tms; i++){
						m[row][i]=f1*m[col][i]+m[row][i];
					}
				}
			}
		}
		return m;	// Array
	},
	create: function(/* Number */a, /* Number */b, /* Number? */value){
		// summary:
		//		Create a new matrix with rows a and cols b, and pre-populate with value.
		value=value||0;
		var m=[];
		for (var i=0; i<b; i++){
			m[i]=[];
			for(var j=0; j<a; j++) {
				m[i][j]=value;
			}
		}
		return m;	// Array
	},
	ones: function(/* Number */a, /* Number */b){
		// summary:
		//		Create a matrix pre-populated with ones
		return this.create(a, b, 1);	// Array
	},
	zeros: function(/* Number */a, /* Number */b){
		// summary:
		//		Create a matrix pre-populated with zeros
		return this.create(a, b);	// Array
	},
	identity: function(/* Number */size, /* Number? */scale){
		// summary:
		//		Create an identity matrix based on the size and scale.
		scale=scale||1;
		var m=[];
		for(var i=0; i<size; i++){
			m[i]=[];
			for(var j=0; j<size; j++){
				m[i][j]=(i==j?scale:0);
			}
		}
		return m;	// Array
	},
	adjoint: function(/* Array */a){
		// summary:
		//		Find the adjoint of the passed matrix
		var tms=a.length;
		if(tms<=1){
			console.warn("Can't find the adjoint of a matrix with a dimension less than 2");
			return [[0]];
		}
		if(a.length!=a[0].length){
			console.warn("Can't find the adjoint of a non-square matrix");
			return [[0]];
		}
		var m=this.create(tms, tms), ap=this.create(tms-1, tms-1);
		var ii=0, jj=0, ia=0, ja=0, det=0;
		for(var i=0; i<tms; i++){
			for (var j=0; j<tms; j++){
				ia=0;
				for(ii=0; ii<tms; ii++){
					if(ii==i){
						continue;
					}
					ja = 0;
					for(jj=0; jj<tms; jj++){
						if(jj==j){
							continue;
						}
						ap[ia][ja] = a[ii][jj];
						ja++;
					}
					ia++;
				}
				det=this.determinant(ap);
				m[i][j]=Math.pow(-1, (i+j))*det;
			}
		}
		return this.transpose(m);	// Array
	},
	transpose: function(/* Array */a){
		// summary:
		//		Transpose the passed matrix (i.e. rows to columns)
		var m=this.create(a.length, a[0].length);
		for(var i=0; i<a.length; i++){
			for(var j=0; j<a[i].length; j++){
				m[j][i]=a[i][j];
			}
		}
		return m;	// Array
	},
	format: function(/* Array */a, /* Number? */points){
		// summary:
		//		Return a string representation of the matrix, rounded to points (if needed)
		points=points||5;
		function format_int(x, dp){
			var fac=Math.pow(10, dp);
			var a=Math.round(x*fac)/fac;
			var b=a.toString();
			if(b.charAt(0)!="-"){
				b=" "+b;
			}
			if(b.indexOf(".")>-1){
				b+=".";
			}
			while(b.length<dp+3){
				b+="0";
			}
			return b;
		}
		var ya=a.length;
		var xa=ya>0?a[0].length:0;
		var buffer="";
		for(var y=0; y<ya; y++){
			buffer+="| ";
			for(var x=0; x<xa; x++){
				buffer+=format_int(a[y][x], points)+" ";
			}
			buffer+="|\n";
		}
		return buffer;	// string
	},
	copy: function(/* Array */a){
		// summary:
		//		Create a copy of the passed matrix
		var ya=a.length, xa=a[0].length, m=this.create(xa, ya);
		for(var y=0; y<ya; y++){
			for(var x=0; x<xa; x++){
				m[y][x]=a[y][x];
			}
		}
		return m;	// Array
	},
	scale: function(/* Array */a, /* Number */factor){
		// summary:
		//		Create a copy of passed matrix and scale each member by factor.
		a=this.copy(a);
		var ya=a.length, xa=a[0].length;
		for(var y=0; y<ya; y++){
			for(var x=0; x<xa; x++){
				a[y][x]*=factor;
			}
		}
		return a;
	}
});

return dojox.math.matrix;
});
