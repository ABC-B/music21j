/**
 * music21j -- Javascript reimplementation of Core music21p features.  
 * music21/stream -- Streams -- objects that hold other Music21Objects
 * 
 * Does not implement the full features of music21p Streams by a long shot...
 *
 * Copyright (c) 2013-14, Michael Scott Cuthbert and cuthbertLab
 * Based on music21 (=music21p), Copyright (c) 2006–14, Michael Scott Cuthbert and cuthbertLab
 * 
 */
define(['music21/base','music21/renderOptions','music21/clef'], function(require) {
	var stream = {};
	
	stream.Stream = function () {
		music21.base.Music21Object.call(this);
		this.classes.push('Stream');
		this._duration = undefined;
		
	    this._elements = [];
	    this._clef = undefined;
	    this.displayClef = undefined;
	    
	    this._keySignature =  undefined; // a music21.key.KeySignature object
	    this._timeSignature = undefined; // temp hack -- a string...
	    
	    this.autoBeam = true;
	    this.activeVFStave = undefined;
	    this.renderOptions = new music21.renderOptions.RenderOptions();
	    this._tempo = undefined;
	    
	    this._stopPlaying = false;
	    this._allowMultipleSimultaneousPlays = true; // not implemented yet.

	    this.append = function (el) {
	    	try {
    	        if ((el.inClass !== undefined) && el.inClass('NotRest')) {
    	        	this.clef.setStemDirection(el);    		
    	    	}
    	    	this.elements.push(el);
    	    	el.parent = this; // would prefer weakref, but does not exist in JS.
	    	} catch (err) {
	    	    console.error("Cannot append element ", el, " to stream ", this, " : ", err);
	    	}
	    };
	    this.hasSubStreams = function () {
	    	var hasSubStreams = false;
	    	for (var i = 0; i < this.length; i++) {
	    		var el = this.elements[i];
	    		if (el.inClass('Stream')) {
	    			hasSubStreams = true;
	    			break;
	    		}
	    	}
	    	return hasSubStreams;
	    };
	    
	    Object.defineProperties(this, {
            'duration': {
                configurable: true,
                enumerable: true,
                get: function () {
                    if (this._duration !== undefined) {
                        return this._duration;
                    }
                    var totalQL = 0.0;
                    for (var i = 0; i < this.length; i++) {
                        var el = this.elements[i];
                        if (el.duration !== undefined) {
                            totalQL += el.duration.quarterLength;                            
                        } 
                    }
                    return new music21.duration.Duration(totalQL);
                },
                set: function(newDuration) {
                    this._duration = newDuration;
                }
            },
	        'flat': {
                configurable: true,
                enumerable: true,
	    		get: function () {
	    			if (this.hasSubStreams()) {
	        			var tempEls = [];
	        			for (var i = 0; i < this.length; i++) {
	        				var el = this.elements[i];
	        				var tempArray = el.flat;
	        				tempEls.push.apply(tempEls, tempArray);
	        			}
	        			return tempEls;
	    			} else {
	    				return this.elements;
	    			}
	    		},
	    	},
			'tempo': {
                configurable: true,
                enumerable: true,
				get: function () {
					if (this._tempo == undefined && this.parent != undefined) {
						return this.parent.tempo;
					} else if (this._tempo == undefined) {
						return 150;
					} else {
						return this._tempo;
					}
				},
				set: function (newTempo) {
					this._tempo = newTempo;
				}
			},
			'clef': {
                configurable: true,
                enumerable: true,
				get: function () {
					if (this._clef == undefined && this.parent == undefined) {
						return new music21.clef.Clef('treble');
					} else if (this._clef == undefined) {
						return this.parent.clef;
					} else {
						return this._clef;
					}
				},
				set: function (newClef) {
					this._clef = newClef;
				}
			},
			'keySignature': {
                configurable: true,
                enumerable: true,
				get: function () {
					if (this._keySignature == undefined && this.parent != undefined) {
						return this.parent.keySignature;
					} else {
						return this._keySignature;
					}
				},
				set: function (newKeySignature) {
					this._keySignature = newKeySignature;
				}
			},
			'timeSignature': {
                configurable: true,
                enumerable: true,
				get: function () {
					if (this._timeSignature == undefined && this.parent != undefined) {
						return this.parent.timeSignature;
					} else {
						return this._timeSignature;
					}
				},
				set: function (newTimeSignature) {
					if (typeof(newTimeSignature) == 'string') {
					    newTimeSignature = new music21.meter.TimeSignature(newTimeSignature);
					}
				    this._timeSignature = newTimeSignature;
				}
			},
			'maxSystemWidth': {
                configurable: true,
                enumerable: true,
				get: function () {
					if (this.renderOptions.maxSystemWidth == undefined && this.parent != undefined) {
						return this.parent.maxSystemWidth;
					} else if (this.renderOptions.maxSystemWidth != undefined) {
						return this.renderOptions.maxSystemWidth;
					} else {
						return 750;
					}
				},
				set: function (newSW) {
					this.renderOptions.maxSystemWidth = newSW;
				}
			},
			'parts': {
                configurable: true,
                enumerable: true,
				get: function() {
					var parts = [];
					for (var i = 0; i < this.length; i++) {
						if (this.elements[i].inClass('Part')) {
							parts.push(this.elements[i]);
						}
					}
					return parts;
				}
			},
			'measures': {
                configurable: true,
                enumerable: true,
				get: function() {
					var measures = [];
					for (var i = 0; i < this.length; i++) {
						if (this.elements[i].inClass('Measure')) {
							measures.push(this.elements[i]);
						}
					}
					return measures;
				}
			},
			'length': {
                configurable: true,
                enumerable: true,
				get: function() {
					return this.elements.length;
				}
			},
			'elements': {
                configurable: true,
                enumerable: true,
				get: function() {
					return this._elements;
				},
				set: function(newElements) {
					this._elements = newElements;
				}
			}
	    });
	    
	    
	    this.makeAccidentals = function () {
			// cheap version of music21p method
			var extendableStepList = {};
			var stepNames = ['C','D','E','F','G','A','B'];
	    	for (var i = 0; i < stepNames.length; i++) {
	    		var stepName = stepNames[i];
	    		var stepAlter = 0;
	    		if (this.keySignature != undefined) {
	    			var tempAccidental = this.keySignature.accidentalByStep(stepName);
	    			if (tempAccidental != undefined) {
	    				stepAlter = tempAccidental.alter;
	    				//console.log(stepAlter + " " + stepName);
	    			}
	    		}
	    		extendableStepList[stepName] = stepAlter;
	    	}
			var lastOctaveStepList = [];
			for (var i =0; i < 10; i++) {
				var lastStepDict = $.extend({}, extendableStepList);
				lastOctaveStepList.push(lastStepDict);
			}
			var lastOctavelessStepDict = $.extend({}, extendableStepList); // probably unnecessary, but safe...
			for (var i = 0; i < this.length; i++) {
				el = this.elements[i];
				if (el.pitch != undefined) {
					var p = el.pitch;
					var lastStepDict = lastOctaveStepList[p.octave];
					this.makeAccidentalForOnePitch(p, lastStepDict, lastOctavelessStepDict);
				} else if (el._noteArray != undefined) {
					for (var j = 0; j < el._noteArray.length; j++) {
						var p = el._noteArray[j].pitch;
						var lastStepDict = lastOctaveStepList[p.octave];
						this.makeAccidentalForOnePitch(p, lastStepDict, lastOctavelessStepDict);
					}
				}
			}
	    };

	    this.makeAccidentalForOnePitch = function (p, lastStepDict, lastOctavelessStepDict) {
			var newAlter;
			if (p.accidental == undefined) {
				newAlter = 0;
			} else {
				newAlter = p.accidental.alter;
			}
			//console.log(p.name + " " + lastStepDict[p.step].toString());
			if ((lastStepDict[p.step] != newAlter) ||
				(lastOctavelessStepDict[p.step] != newAlter)
				 ) {
			    if (p.accidental === undefined) {
			        p.accidental = new music21.pitch.Accidental('natural');
			    }
			    p.accidental.displayStatus = true;
				//console.log("setting displayStatus to true");
			} else if ( (lastStepDict[p.step] == newAlter) &&
						(lastOctavelessStepDict[p.step] == newAlter) ) {
                if (p.accidental !== undefined) {
                    p.accidental.displayStatus = false;
                }
				//console.log("setting displayStatus to false");
			}
			lastStepDict[p.step] = newAlter;
			lastOctavelessStepDict[p.step] = newAlter;
	    };
	    /*  VexFlow functionality */
	    
	    this.vexflowNotes = function () {
	        var notes = [];
	        for (var i = 0; i < this.length; i++) {
	        	var thisEl = this.elements[i];
	        	if (thisEl.inClass('GeneralNote') && (thisEl.duration !== undefined)) {
		        	var tn = thisEl.vexflowNote(this.clef.name);
		        	notes.push(tn);
	        	}
	        }
	        //alert(notes.length);
	        return notes;
	    };
	    this.vexflowVoice = function () {
	        var totalLength = this.duration.quarterLength;
	        var numSixteenths = totalLength / 0.25;
	        var beatValue = 16;
	        if (numSixteenths % 8 == 0) { beatValue = 2; numSixteenths = numSixteenths / 8; }
	        else if (numSixteenths % 4 == 0) { beatValue = 4; numSixteenths = numSixteenths / 4; }
	        else if (numSixteenths % 2 == 0) { beatValue = 8; numSixteenths = numSixteenths / 2; }
	        //console.log('creating voice');
	        if (music21.debug) {
	        	console.log("New voice, num_beats: " + numSixteenths.toString() + " beat_value: " + beatValue.toString());
	        }
	        var vfv = new Vex.Flow.Voice({ num_beats: numSixteenths,
	                                    beat_value: beatValue,
	                                    resolution: Vex.Flow.RESOLUTION });
			//alert(numSixteenths + " " + beatValue);
	        //console.log('voice created');
	        vfv.setMode(Vex.Flow.Voice.Mode.SOFT);
			return vfv;
	    };
	    
	    this.vexflowStaffWidth = undefined;
	    this.estimateStaffLength = function () {
	    	if (this.vexflowStaffWidth != undefined) {
	    		//console.log("Overridden staff width: " + this.vexflowStaffWidth);
	    		return this.vexflowStaffWidth;
	    	}
	    	if (this.inClass('Score')) {
	    		var tl = this.elements[0].estimateStaffLength(); // get from first part... 
	    		//console.log('total Length: ' + tl);
	    		return tl;
	    	} else if (this.hasSubStreams()) { // part
	    		var totalLength = 0;
	    		for (var i = 0; i < this.length; i++) {
	    			var m = this.elements[i];
	    			totalLength += m.estimateStaffLength() + m.vexflowStaffPadding;
	    			if ((i != 0) && (m.renderOptions.startNewSystem == true)) {
	    				break;
	    			}
	    		}
	    		return totalLength;
	    	} else {
	    		var vfro = this.renderOptions;
		    	var totalLength = 30 * this.length;
				totalLength += vfro.displayClef ? 20 : 0;
				totalLength += (vfro.displayKeySignature && this.keySignature) ? 5 * Math.abs(this.keySignature.sharps) : 0;
				totalLength += vfro.displayTimeSignature ? 30 : 0; 
				//totalLength += this.vexflowStaffPadding;
				return totalLength;
	    	}
	    };

	    this.estimateStreamHeight = function (ignoreSystems) {
	    	var staffHeight = 120;
	    	var systemPadding = 30;
	    	if (this.inClass('Score')) {
	    		var numParts = this.length;
	    		var numSystems = this.numSystems();
	    		if (numSystems == undefined || ignoreSystems) {
	    			numSystems = 1;
	    		}
	    		var scoreHeight = (numSystems * staffHeight * numParts) + ((numSystems - 1) * systemPadding);
	    		//console.log('scoreHeight of ' + scoreHeight);
	    		return scoreHeight;
	    	} else if (this.inClass('Part')) {
	    		var numSystems = 1;
	    		if (!ignoreSystems) {
	    			numSystems = this.numSystems();
	    		}
	    		if (music21.debug) {
	    			console.log("estimateStreamHeight for Part: numSystems [" + numSystems +
	    			"] * staffHeight [" + staffHeight + "] + (numSystems [" + numSystems +
	    			"] - 1) * systemPadding [" + systemPadding + "]."
	    			);
	    		}
	    		return numSystems * staffHeight + (numSystems - 1) * systemPadding;
	    	} else {
	    		return staffHeight;
	    	}
	    };

	    this.setSubstreamRenderOptions = function () {
	    	/* does nothing for standard streams ... */
	    };
	    this.resetRenderOptionsRecursive = function () {
	    	this.renderOptions = new music21.renderOptions.RenderOptions();
	    	for (var i = 0; i < this.length; i++) {
	    		var el = this.elements[i];
	    		if (el.inClass('Stream')) {
	    			el.resetRenderOptionsRecursive();
	    		}
	    	}
	    };
	    
	    this.activeFormatter = undefined;
	    
	    this.vexflowStaffPadding = 60;

	    this.renderVexflowOnCanvas = function (canvas, renderer) {
	    	if (renderer == undefined) {
	    		renderer = new Vex.Flow.Renderer(canvas, Vex.Flow.Renderer.Backends.CANVAS);
	    	}
	    	var hasSubStreams = this.hasSubStreams();
	    	if (hasSubStreams) {
	    		for (var i = 0; i < this.length; i++) {
	    			var m = this.elements[i];
	    			if (i == this.length - 1) {
	    				m.renderOptions.rightBarline = 'end';
	    			}
	    			m.renderVexflowOnCanvas(canvas, renderer);
	    		}
	    	} else {
	    		this.makeAccidentals();
	    		var stave = this.renderVexflowNotesOnCanvas(canvas, renderer);
	    		this.activeVFStave = stave;
	    	}
	    	if (this.inClass('Score')) {
	    		this.addStaffConnectors(renderer);
	    	}
		};
		
	    this.renderVexflowNotesOnCanvas = function (canvas, renderer) { 	
	    	if (renderer == undefined) {
	    		renderer = new Vex.Flow.Renderer(canvas, Vex.Flow.Renderer.Backends.CANVAS);
	    	}
	    	var ctx = renderer.getContext();

			var vfro = this.renderOptions;
			// measure level...
			var width = vfro.width;
			if (width == undefined) {
				width = this.estimateStaffLength() + this.vexflowStaffPadding;
			}
			var top = vfro.top;
			if (top == undefined) {
				top = 0;
			}
			var left = vfro.left;
			if (left == undefined) {
				left = 10;
			}
			//console.log('streamLength: ' + streamLength);
			var stave = new Vex.Flow.Stave(left, top, width);
	        if (vfro.showMeasureNumber) {
	        	stave.setMeasure(vfro.measureIndex + 1);
	        }
			if (vfro.displayClef) {
				stave.addClef(this.clef.name);
			}
			if ((this.keySignature != undefined) && (vfro.displayKeySignature)) {
				stave.addKeySignature(this.keySignature.vexflow());
			}
			
	        if ((this.timeSignature != undefined) && (vfro.displayTimeSignature)) {
				stave.addTimeSignature(
				        this.timeSignature.numerator.toString() 
				        + "/" 
				        + this.timeSignature.denominator.toString()); // TODO: convertToVexflow...
			}
	        if (this.renderOptions.rightBarline != undefined) {
	        	var bl = this.renderOptions.rightBarline;
	        	var barlineMap = {
	        			'single': 'SINGLE',
	        			'double': "DOUBLE",
	        			'end': 'END',
	        			};
	        	var vxBL = barlineMap[bl];
	        	if (vxBL != undefined) {
	        		stave.setEndBarType(Vex.Flow.Barline.type[vxBL]);
	        	}
	        }
	        
	        stave.setContext(ctx);
			stave.draw();

			// add notes...
	        var notes = this.vexflowNotes();
	        var voice = this.vexflowVoice();

			voice.addTickables(notes);
			
			// find beam groups -- n.b. this wipes out stem direction and
			//      screws up middle line stems -- worth it for now.
			var beamGroups = [];
			if (this.autoBeam) {
				beamGroups = Vex.Flow.Beam.applyAndGetBeams(voice);
			} 
				
			var formatter = new Vex.Flow.Formatter();
			if (music21.debug) {
				console.log("Voice: ticksUsed: " + voice.ticksUsed + " totalTicks: " + voice.totalTicks);
			}
			//Vex.Flow.Formatter.FormatAndDraw(ctx, stave, notes);
			formatter.joinVoices([voice]);
			formatter.formatToStave([voice], stave);
			//formatter.format([voice], this.estimateStaffLength() );

			voice.draw(ctx, stave);

			// draw beams
			for(var i = 0; i < beamGroups.length; i++){
				 beamGroups[i].setContext(ctx).draw();
			}
			
			this.activeFormatter = formatter;
			this.applyFormatterInformationToNotes(stave);
			//console.log(stave.start_x + " -- stave startx");
			//console.log(stave.glyph_start_x + " -- stave glyph startx");
			return stave;
	    };
	    this.applyFormatterInformationToNotes = function (stave) {
	        // mad props to our friend Vladimir Viro for figuring this out!
	        // visit http://peachnote.com/
	        
	        var formatter = this.activeFormatter;
	        var noteOffsetLeft = 0;
	        //var staveHeight = 80;
	        if (stave != undefined) {
	        	noteOffsetLeft = stave.start_x + stave.glyph_start_x;
	        	if (music21.debug) {
	        		console.log("noteOffsetLeft: " + noteOffsetLeft + " ; stave.start_x: " + stave.start_x);
	            	console.log("Bottom y: " + stave.getBottomY() );	        			
	        	}
	        	//staveHeight = stave.height;
	        }
	        
			var nextTicks = 0;
			for (var i = 0; i < this.length; i ++ ) {
				var el = this.elements[i];
				if (el.inClass('Note') || el.inClass('Chord')) { // note or chord.
					var vfn = el.activeVexflowNote;
					if (vfn === undefined) {
					    continue;
					}
					var nTicks = parseInt(vfn.ticks);
					var formatterNote = formatter.tContexts.map[String(nextTicks)];				   
					nextTicks += nTicks;
				    el.x = vfn.getAbsoluteX();
				    //console.log(i + " " + el.x + " " + formatterNote.x + " " + noteOffsetLeft);
				    if (formatterNote === undefined) {
				        continue;
				    }
				    
				    el.width = formatterNote.width;		    
				    if (el.pitch != undefined) { // note only...
				    	el.y = stave.getBottomY() - (this.clef.firstLine - el.pitch.diatonicNoteNum) * stave.options.spacing_between_lines_px;
				    	//console.log('Note DNN: ' + el.pitch.diatonicNoteNum + " ; y: " + el.y);
				    }
			    }
			}
			if (music21.debug) {
		        for (var i = 0; i < this.length; i ++ ) {
		            var n = this.elements[i];
		            if (n.pitch != undefined) {
		            	console.log(n.pitch.diatonicNoteNum + " " + n.x + " " + (n.x + n.width));
		            }
		        }
			}
			this.storedVexflowStave = stave;
	    };
	    
	    /* MIDI related routines... */
	    
	    this.playStream = function (startNote) {
	    	/*
	    	 * Play the Stream.  Does not currently do noteOff
	    	 */
	        var currentNote = 0;
	        if (startNote !== undefined) {
	        	currentNote = startNote;
	        }
	        var flatEls = this.flat;
	        var lastNote = flatEls.length;
	        var tempo = this.tempo;
	        this._stopPlaying = false;
	        var thisStream = this;
	        
	        var playNext = function (elements) {
	            if (currentNote < lastNote && !thisStream._stopPlaying) {
	                var el = elements[currentNote];
	                if (el.duration !== undefined) {
    	                    
    	                var ql = el.duration.quarterLength;
    	                var milliseconds = 60 * ql * 1000 / tempo;
    	                if (el.inClass('Note')) { // Note, not rest
    				 	    var midNum = el.pitch.midi;
    				 	    MIDI.noteOn(0, midNum, 100, 0);
    				    } else if (el.inClass('Chord')) {
    					    for (var j = 0; j < el._noteArray.length; j++) {
    					 	    var midNum = el._noteArray[j].pitch.midi;
    					 	    MIDI.noteOn(0, midNum, 100, 0);					   
    					    }
    				    }
	                }
	                currentNote += 1;
	            	setTimeout( function () { playNext(elements); }, milliseconds);
	            }
	        };
	        playNext(flatEls);
	    };
	    
	    this.stopPlayStream = function () {
	    	this._stopPlaying = true;
	    	for (var i = 0; i < 127; i++) {
	    		MIDI.noteOff(0, midNum, 0);
	    	}
		};
	    
		// reflow
		
		this.windowReflowStart = function (jCanvas) {
		    // set up a bunch of windowReflow bindings that affect the canvas.
		    var callingStream = this;
		    var jCanvasNow = jCanvas;
		    $(window).bind('resizeEnd', function() {
		        //do something, window hasn't changed size in 500ms
		        var jCanvasParent = jCanvasNow.parent();
		        var newWidth = jCanvasParent.width();
		        var canvasWidth = newWidth;
		        //console.log(canvasWidth);
		        //console.log('resizeEnd triggered', newWidth);
		        callingStream.resetRenderOptionsRecursive();
		        callingStream.maxSystemWidth = canvasWidth - 40;
		        jCanvasNow.remove();
		        var canvasObj = callingStream.appendNewCanvas(jCanvasParent);
		        jCanvasNow = $(canvasObj);
		    });
		    $(window).resize( function() {
		        if (this.resizeTO) {
		            clearTimeout(this.resizeTO);
		        }
		        this.resizeTO = setTimeout(function() {
		            $(this).trigger('resizeEnd');
		        }, 200);
		    })
		    setTimeout(function() {
                $(this).trigger('resizeEnd');
            }, 1000);
		};
		
	    // Canvas Routines ... 
	    
		this.createNewCanvas = function (scaleInfo, width, height) {
	    	if (this.hasSubStreams() ) { 
	    		this.setSubstreamRenderOptions();
	    	}

			if (scaleInfo == undefined) {
	    		scaleInfo = { height: '100px', width: 'auto'};
	    	}
			var newCanvas = $('<canvas/>', scaleInfo);

			if (width != undefined) {
				newCanvas.attr('width', width);
			} else {
				newCanvas.attr('width', this.estimateStaffLength() + this.vexflowStaffPadding + 0);
			}
			if (height != undefined) {
				newCanvas.attr('height', height);		
			} else {
				var computedHeight;
				if (this.renderOptions.height == undefined) {
					computedHeight = this.estimateStreamHeight();
					//console.log('computed Height estim: ' + computedHeight);
				} else {
					computedHeight = this.renderOptions.height;
					//console.log('computed Height: ' + computedHeight);
				}
				newCanvas.attr('height', computedHeight );
				newCanvas.css('height', Math.floor(computedHeight * .7).toString() + "px");
			}
			return newCanvas;
		};
	    this.createPlayableCanvas = function (scaleInfo, width, height) {
			this.renderOptions.events['click'] = 'play';
			return this.createCanvas();
	    };
	    this.createCanvas = function(scaleInfo, width, height) {
			var newCanvas = this.createNewCanvas(scaleInfo, width, height);
	        this.drawCanvas(newCanvas[0]);
	        return newCanvas;    
	    };
	    
	    this.drawCanvas = function (canvas) {
	    	this.renderVexflowOnCanvas(canvas);
	        canvas.storedStream = this;
	        this.setRenderInteraction(canvas);    
	    };    
	    
	    this.appendNewCanvas = function (bodyElement, scaleInfo, width, height) {
	        if (bodyElement == undefined) {
	            bodyElement = 'body';
	        }
	        canvasBlock = this.createCanvas(scaleInfo, width, height);
	        $(bodyElement).append(canvasBlock);
			return canvasBlock[0];
	    };
	    
	    this.replaceLastCanvas = function (bodyElement, scaleInfo) {
	        if (bodyElement == undefined) {
	            bodyElement = 'body';
	        }
	        canvasBlock = this.createCanvas(scaleInfo);
	        $(bodyElement + " " + 'canvas').replaceWith(canvasBlock);
			return canvasBlock[0];
		};
		
		this.setRenderInteraction = function (canvas) {
			/*
			 * Set the type of interaction on the canvas based on 
			 *    Stream.renderOptions.events['click']
			 *    Stream.renderOptions.events['dblclick']
			 *    
			 * Currently the only options available for each are:
			 *    'play' (string)
			 *    customFunction
			 */
			var jCanvas = $(canvas);
			
			$.each(this.renderOptions.events, $.proxy(function (eventType, eventFunction) {
				if (typeof(eventFunction) == 'string' && eventFunction == 'play') {
					jCanvas.on(eventType, function () { this.storedStream.playStream(); });
				} else if (typeof(eventFunction) == 'string' && eventType == 'resize' && eventFunction == 'reflow') {
				    this.windowReflowStart(jCanvas);
				} else if (eventFunction != undefined) {
					jCanvas.on(eventType, eventFunction);
				}
			}, this ) );
		};
		this.recursiveGetStoredVexflowStave = function () {
			/*
			 * Recursively search downward for the closest storedVexflowStave...
			 */
			var storedVFStave = this.storedVexflowStave;
			if (storedVFStave == undefined) {
				if (!this.hasSubStreams()) {
					return undefined;
				} else {
					storedVFStave = this.elements[0].storedVexflowStave;
					if (storedVFStave == undefined) {
						// bad programming ... should support continuous recurse
						// but good enough for now...
						if (this.elements[0].hasSubStreams()) {
							storedVFStave = this.elements[0].elements[0].storedVexflowStave;
						}
					}
				}
			}
			return storedVFStave;
		};
		
		this.getPixelScaling = function (canvas) {
			if (canvas == undefined) {
				return 1;
			}
			var canvasHeight = $(canvas).height();
			//var css = parseFloat(jCanvas.css('height'));
			
			var storedVFStave = this.recursiveGetStoredVexflowStave();
			var lineSpacing = storedVFStave.options.spacing_between_lines_px;
			var linesAboveStaff = storedVFStave.options.space_above_staff_ln;
			var totalLines = (storedVFStave.options.num_lines - 1) + linesAboveStaff + storedVFStave.options.space_below_staff_ln;
			/* var firstLineOffset = ( (storedVFStave.options.num_lines - 1) + linesAboveStaff) * lineSpacing; 
			   var actualVFStaffOnlyHeight = (storedVFStave.height - (linesAboveStaff * lineSpacing)); */
			var pixelScaling = totalLines * lineSpacing/canvasHeight;		
			if (music21.debug) {
				console.log('canvasHeight: ' + canvasHeight + " totalLines*lineSpacing: " + totalLines*lineSpacing + " staveHeight: " + storedVFStave.height);
			}
			return pixelScaling;
		};
		this.getUnscaledXYforCanvas = function (canvas, e) {
			/*
			 * return a list of [Y, X] for
			 * a canvas element
			 */
			var offset;
			if (canvas == undefined) {
				offset = {left: 0, top: 0};
			} else {
				offset = $(canvas).offset();			
			}
			/*
			 * mouse event handler code from: http://diveintohtml5.org/canvas.html
			 */
			var xClick, yClick;
			if (e.pageX != undefined && e.pageY != undefined) {
				xClick = e.pageX;
				yClick = e.pageY;
			} else { 
				xClick = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
				yClick = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
			}
			var xPx = (xClick - offset.left);
			var yPx = (yClick - offset.top);
			return [yPx, xPx];
		};
		
		this.getScaledXYforCanvas = function (canvas, e) {
			/*
			 * return a list of [scaledY, scaledX] for
			 * a canvas element
			 */
			var _ = this.getUnscaledXYforCanvas(canvas, e);
			var xPx = _[1];
			var yPx = _[0];
			var pixelScaling = this.getPixelScaling(canvas);
			
			var yPxScaled = yPx * pixelScaling;
			var xPxScaled = xPx * pixelScaling;
			return [yPxScaled, xPxScaled];
		};
		this.diatonicNoteNumFromScaledY = function (yPxScaled) {
			/*
			 * Given a Y position find the note at that position.
			 * searches this.storedVexflowStave
			 */
			var storedVFStave = this.recursiveGetStoredVexflowStave();
			var lineSpacing = storedVFStave.options.spacing_between_lines_px;
			var linesAboveStaff = storedVFStave.options.space_above_staff_ln;

			var notesFromTop = yPxScaled * 2 / lineSpacing;
			var notesAboveFirstLine = ((storedVFStave.options.num_lines - 1 + linesAboveStaff) * 2 ) - notesFromTop;
			var clickedDiatonicNoteNum = this.clef.firstLine + Math.round(notesAboveFirstLine);
			return clickedDiatonicNoteNum;
		};
		this.noteElementFromScaledX = function (xPxScaled, allowablePixels, y) {
			/*
			 * Return the note at pixel X (or within allowablePixels [default 10])
			 * of the note.
			 * 
			 * y element is optional and used to discover which part or system
			 * we are on
			 */
			var foundNote = undefined;
			if (allowablePixels == undefined) {
				allowablePixels = 10;	
			}

			for (var i = 0; i < this.length; i ++) {
				var n = this.elements[i];
				/* should also
				 * compensate for accidentals...
				 */
				if (xPxScaled > (n.x - allowablePixels) && 
						xPxScaled < (n.x + n.width + allowablePixels)) {
					foundNote = n;
					break; /* O(n); can be made O(log n) */
				}
			}		
			//console.log(n.pitch.nameWithOctave);
			return foundNote;
		};
		
		this.canvasClickedNotes = function (canvas, e, x, y) {
			/*
			 * Return a list of [diatonicNoteNum, closestXNote]
			 * for an event (e) called on the canvas (canvas)
			 */
			if (x == undefined || y == undefined) {
				var _ = this.getScaledXYforCanvas(canvas, e);
				y = _[0];
				x = _[1];
			}
			var clickedDiatonicNoteNum = this.diatonicNoteNumFromScaledY(y);
			var foundNote = this.noteElementFromScaledX(x, undefined, y);
			return [clickedDiatonicNoteNum, foundNote];
		};
		
		this.changedCallbackFunction = undefined;
		
		this.canvasChangerFunction = function (e) {
			/* N.B. -- not to be called on a stream -- "this" refers to the CANVAS
			
				var can = s.appendNewCanvas();
				$(can).on('click', s.canvasChangerFunction);
			
			*/
			var ss = this.storedStream;
			var _ = ss.canvasClickedNotes(this, e),
				 clickedDiatonicNoteNum = _[0],
				 foundNote = _[1];
			if (foundNote == undefined) {
				if (music21.debug) {
					console.log('No note found');				
				}
			}
			return ss.noteChanged(clickedDiatonicNoteNum, foundNote, this);
		};

		this.noteChanged = function (clickedDiatonicNoteNum, foundNote, canvas) {
			if (foundNote != undefined) {
				var n = foundNote;
				p = new music21.pitch.Pitch("C");
				p.diatonicNoteNum = clickedDiatonicNoteNum;
				p.accidental = n.pitch.accidental;
				n.pitch = p;
				n.stemDirection = undefined;
				this.clef.setStemDirection(n);
				this.activeNote = n;
				this.redrawCanvas(canvas);
				if (this.changedCallbackFunction != undefined) {
					this.changedCallbackFunction({foundNote: n, canvas: canvas});
				}
			}
		};
		
		this.redrawCanvas = function (canvas) {
			//this.resetRenderOptionsRecursive();
			//this.setSubstreamRenderOptions();
			var newCanv = this.createNewCanvas( { height: canvas.style.height,
												   width: canvas.style.width },
												canvas.width,
												canvas.height );
			this.drawCanvas(newCanv[0]);
			$(canvas).replaceWith( newCanv );
			$.event.copy($(canvas), newCanv); /* copy events -- using custom extension... */
		};
		
		this.editableAccidentalCanvas = function (scaleInfo, width, height) {
			/*
			 * Create an editable canvas with an accidental selection bar.
			 */
			var d = $("<div/>").css('text-align','left').css('position','relative');
			var buttonDiv = this.getAccidentalToolbar();
			d.append(buttonDiv);
			d.append( $("<br clear='all'/>") );
			this.renderOptions.events['click'] = this.canvasChangerFunction;
			var can = this.appendNewCanvas(d, scaleInfo, width, height);
			if (scaleInfo == undefined) {
				$(can).css('height', '140px');
			}
			return d;
		};

		
		/*
		 * Canvas toolbars...
		 */
		
		this.getAccidentalToolbar = function () {
			
			var addAccidental = function (clickedButton, alter) {
				/*
				 * To be called on a button...
				 *   this will usually refer to a window Object
				 */
				var accidentalToolbar = $(clickedButton).parent();
				var siblingCanvas = accidentalToolbar.parent().find("canvas");
				var s = siblingCanvas[0].storedStream;
				if (s.activeNote != undefined) {
					n = s.activeNote;
					n.pitch.accidental = new music21.pitch.Accidental(alter);
					/* console.log(n.pitch.name); */
					s.redrawCanvas(siblingCanvas[0]);
					if (s.changedCallbackFunction != undefined) {
						s.changedCallbackFunction({canvas: siblingCanvas[0]});
					}
				}
			};

			
			var buttonDiv = $("<div/>").attr('class','buttonToolbar vexflowToolbar').css('position','absolute').css('top','10px');
			buttonDiv.append( $("<span/>").css('margin-left', '50px'));
			buttonDiv.append( $("<button>♭</button>").click( function () { addAccidental(this, -1); } ));
			buttonDiv.append( $("<button>♮</button>").click( function () { addAccidental(this, 0); } ));
			buttonDiv.append( $("<button>♯</button>").click( function () { addAccidental(this, 1); } ));
			return buttonDiv;

		};
		this.getPlayToolbar = function () {
			var playStream = function (clickedButton) {
				var playToolbar = $(clickedButton).parent();
				var siblingCanvas = playToolbar.parent().find("canvas");
				var s = siblingCanvas[0].storedStream;
				s.playStream();
			};
			var stopStream = function (clickedButton) {
				var playToolbar = $(clickedButton).parent();
				var siblingCanvas = playToolbar.parent().find("canvas");
				var s = siblingCanvas[0].storedStream;
				s.stopStream();
			};
			var buttonDiv = $("<div/>").attr('class','playToolbar vexflowToolbar').css('position','absolute').css('top','10px');
			buttonDiv.append( $("<span/>").css('margin-left', '50px'));
			buttonDiv.append( $("<button>&#9658</button>").click( function () { playStream(this); } ));
			buttonDiv.append( $("<button>&#9724</button>").click( function () { stopStream(this); } ));
			return buttonDiv;		
		};

	};

	stream.Stream.prototype = new music21.base.Music21Object();
	stream.Stream.prototype.constructor = stream.Stream;

	stream.Measure = function () { 
		stream.Stream.call(this);
		this.classes.push('Measure');
	};

	stream.Measure.prototype = new stream.Stream();
	stream.Measure.prototype.constructor = stream.Measure;

	stream.Part = function () {
		stream.Stream.call(this);
		this.classes.push('Part');
		this.systemHeight = 120;
		
		this.canvasChangerFunction = function (e) {
			/* N.B. -- not to be called on a stream -- "this" refers to the CANVAS
			
				var can = s.appendNewCanvas();
				$(can).on('click', s.canvasChangerFunction);
			
				overrides Stream().canvasChangerFunction
			*/
			var ss = this.storedStream;
			var _ = ss.findSystemForClick(this, e),
				 clickedDiatonicNoteNum = _[0],
				 foundNote = _[1];
			return ss.noteChanged(clickedDiatonicNoteNum, foundNote, this);
		};

		this.findSystemForClick = function(canvas, e) {
			var _ = this.getUnscaledXYforCanvas(canvas, e);
			var y = _[0];
			var x = _[1];
			
			var scalingFunction = this.estimateStreamHeight()/$(canvas).height();
			if (music21.debug) {
				console.log('Scaling function: ' + scalingFunction + ', i.e. this.estimateStreamHeight(): ' + 
						this.estimateStreamHeight() + " / $(canvas).height(): " + $(canvas).height());
			}
			var scaledY = y * scalingFunction;
			var systemIndex = Math.floor(scaledY / this.systemHeight);
			var clickedDiatonicNoteNum = this.diatonicNoteNumFromScaledY(scaledY);
			
			var scaledX = x * scalingFunction;
			var foundNote = this.noteElementFromScaledX(scaledX, undefined, scaledY, systemIndex);
			return [clickedDiatonicNoteNum, foundNote];
		};
		
		this.noteElementFromScaledX = function (scaledX, allowablePixels, scaledY, systemIndex) {
			/*
			 * Override the noteElementFromScaledX for Stream
			 * to take into account sub measures...
			 * 
			 */
			var gotMeasure = undefined;
			for (var i = 0; i < this.length; i++) {
				var m = this.elements[i];
				var vfro = m.renderOptions;
				var left = vfro.left;
				var right = left + vfro.width;
				var top = vfro.top;
				var bottom = top + vfro.height;
				if (music21.debug) {
					console.log("Searching for X:" + Math.round(scaledX) + 
							" Y:" + Math.round(scaledY) + " in M " + i + 
							" with boundaries L:" + left + " R:" + right +
							" T: " + top + " B: " + bottom);
				}
				if (scaledX >= left && scaledX <= right ){
					if (systemIndex == undefined) {
						gotMeasure = m;
						break;
					} else if (vfro.systemIndex == systemIndex) {
						gotMeasure = m;
						break;
					}
				}
			}
			if (gotMeasure) {
				return gotMeasure.noteElementFromScaledX(scaledX, allowablePixels);
			}
		};
		this.setSubstreamRenderOptions = function () {
			var currentMeasureIndex = 0; /* 0 indexed for now */
			var currentMeasureLeft = 20;
			var vfro = this.renderOptions;
			for (var i = 0; i < this.length; i++) {
				var el = this.elements[i];
				if (el.inClass('Measure')) {
					var elvfro = el.renderOptions;
					elvfro.measureIndex = currentMeasureIndex;
					elvfro.top = vfro.top;
					elvfro.partIndex = vfro.partIndex;
					elvfro.left = currentMeasureLeft;
					
					if (currentMeasureIndex == 0) {
						elvfro.displayClef = true;
						elvfro.displayKeySignature = true;
						elvfro.displayTimeSignature = true;
					} else {
						elvfro.displayClef = false;
						elvfro.displayKeySignature = false;
						elvfro.displayTimeSignature = false;					
					}
					elvfro.width = el.estimateStaffLength() + el.vexflowStaffPadding;
					elvfro.height = el.estimateStreamHeight();
					currentMeasureLeft += elvfro.width;
					currentMeasureIndex++;
				}
			}
		};
		
		this.getMeasureWidths = function () {
			/* call after setSubstreamRenderOptions */
			var measureWidths = [];
			for (var i = 0; i < this.length; i++) {
				var el = this.elements[i];
				//console.log(el.classes);
				if (el.inClass('Measure')) {
					var elvfro = el.renderOptions;
					//console.log(i);
					measureWidths[elvfro.measureIndex] = elvfro.width;
				}
			}
			/* console.log(measureWidths);
			 * 
			 */
			return measureWidths;
		};
		
		this.fixSystemInformation = function (systemHeight) {
			/*
			 * Divide a part up into systems and fix the measure
			 * widths so that they are all even.
			 * 
			 * Note that this is done on the part level even though
			 * the measure widths need to be consistent across parts.
			 * 
			 * This is possible because the system is deterministic and
			 * will come to the same result for each part.  Opportunity
			 * for making more efficient through this...
			 */
			/* 
			 * console.log('system height: ' + systemHeight);
			 */
			if (systemHeight == undefined) {
				systemHeight = this.systemHeight; /* part.show() called... */
			} else {
				if (music21.debug) {
					console.log ('overridden systemHeight: ' + systemHeight);
				}
			}
			var measureWidths = this.getMeasureWidths();
			var maxSystemWidth = this.maxSystemWidth; /* of course fix! */
			var systemCurrentWidths = [];
			var systemBreakIndexes = [];
			var lastSystemBreak = 0; /* needed to ensure each line has at least one measure */
			var startLeft = 20; /* TODO: make it obtained elsewhere */
			var currentLeft = startLeft;
			for (var i = 0; i < measureWidths.length; i++) {
				var currentRight = currentLeft + measureWidths[i];
				/* console.log("left: " + currentLeft + " ; right: " + currentRight + " ; m: " + i); */
				if ((currentRight > maxSystemWidth) && (lastSystemBreak != i)) {
					systemBreakIndexes.push(i-1);
					systemCurrentWidths.push(currentLeft);
					//console.log('setting new width at ' + currentLeft);
					currentLeft = startLeft + measureWidths[i];
					lastSystemBreak = i;
				} else {
					currentLeft = currentRight;
				}
			}
			//console.log(systemCurrentWidths);
			//console.log(systemBreakIndexes);

			var currentSystemIndex = 0;
			var leftSubtract = 0;
			for (var i = 0; i < this.length; i++) {
				var m = this.elements[i];
				if (i == 0) {
					m.renderOptions.startNewSystem = true;
				}
				var currentLeft = m.renderOptions.left;

				if ($.inArray(i - 1, systemBreakIndexes) != -1) {
					/* first measure of new System */
					leftSubtract = currentLeft - 20;
					m.renderOptions.displayClef = true;
					m.renderOptions.displayKeySignature = true;
					m.renderOptions.startNewSystem = true;
					currentSystemIndex++;
				} else if (i != 0) {
					m.renderOptions.startNewSystem = false;
					m.renderOptions.displayClef = false;
					m.renderOptions.displayKeySignature = false;
				}
				m.renderOptions.systemIndex = currentSystemIndex;
				var currentSystemMultiplier;
				if (currentSystemIndex >= systemCurrentWidths.length) {
					/* last system... non-justified */;
					currentSystemMultiplier = 1;
				} else {
					var currentSystemWidth = systemCurrentWidths[currentSystemIndex];
					currentSystemMultiplier = maxSystemWidth / currentSystemWidth;
					//console.log('systemMultiplier: ' + currentSystemMultiplier + ' max: ' + maxSystemWidth + ' current: ' + currentSystemWidth);
				}
				/* might make a small gap? fix? */
				var newLeft = currentLeft - leftSubtract;
				//console.log('M: ' + i + ' ; old left: ' + currentLeft + ' ; new Left: ' + newLeft);
				m.renderOptions.left = Math.floor(newLeft * currentSystemMultiplier);
				m.renderOptions.width = Math.floor(m.renderOptions.width * currentSystemMultiplier);
				var newTop = m.renderOptions.top + (currentSystemIndex * systemHeight);
				//console.log('M: ' + i + '; New top: ' + newTop + " ; old Top: " + m.renderOptions.top);
				m.renderOptions.top = newTop;
			}
			
			return systemCurrentWidths;
		};
		this.numSystems = function () {
			var numSystems = 0;
			for (var i = 0; i < this.length; i++) {
				if (this.elements[i].renderOptions.startNewSystem) {
					numSystems++;
				}
			}
			if (numSystems == 0) {
				numSystems = 1;
			}
			return numSystems;
		};
	};

	stream.Part.prototype = new stream.Stream();
	stream.Part.prototype.constructor = stream.Part;

	stream.Score = function () {
		stream.Stream.call(this);
		this.classes.push('Score');
		this.measureWidths = [];
		this.partSpacing = 120;

	    this.playStream = function () {
	    	// play multiple parts in parallel...
	    	for (var i = 0; i < this.length; i++) {
	    		var el = this.elements[i];
	    		if (el.inClass('Part')) {
	    			el.playStream();
	    		}
	    	}
	    };
	    this.stopStream = function () {
	    	for (var i = 0; i < this.length; i++) {
	    		var el = this.elements[i];
	    		if (el.inClass('Part')) {
	    	    	el._stopPlaying = true;
	    		}
	    	}
	    };
		this.setSubstreamRenderOptions = function () {
			var currentPartNumber = 0;
			var currentPartTop = 0;
			var partSpacing = this.partSpacing;
			for (var i = 0; i < this.length; i++) {
				var el = this.elements[i];
				
				if (el.inClass('Part')) {
					el.renderOptions.partIndex = currentPartNumber;
					el.renderOptions.top = currentPartTop;
					el.setSubstreamRenderOptions();
					currentPartTop += partSpacing;
					currentPartNumber++;
				}
			}
			this.evenPartMeasureSpacing();
			var ignoreNumSystems = true;
			var currentScoreHeight = this.estimateStreamHeight(ignoreNumSystems);
			for (var i = 0; i < this.length; i++) {
				var el = this.elements[i];	
				if (el.inClass('Part')) {
					el.fixSystemInformation(currentScoreHeight);
				}
			}
			this.renderOptions.height =  this.estimateStreamHeight();
		};
		this.getMaxMeasureWidths = function () {
			/*  call after setSubstreamRenderOptions
			 *  gets the maximum measure width for each measure
			 *  by getting the maximum for each measure of
			 *  Part.getMeasureWidths();
			 */
			var maxMeasureWidths = [];
			var measureWidthsArrayOfArrays = [];
			for (var i = 0; i < this.length; i++) {
				var el = this.elements[i];
				measureWidthsArrayOfArrays.push(el.getMeasureWidths());
			}
			for (var i = 0; i < measureWidthsArrayOfArrays[0].length; i++) {
				var maxFound = 0;
				for (var j = 0; j < this.length; j++) {
					if (measureWidthsArrayOfArrays[j][i] > maxFound) {
						maxFound = measureWidthsArrayOfArrays[j][i];
					}
				}
				maxMeasureWidths.append(maxFound);
			}
			//console.log(measureWidths);
			return maxMeasureWidths;
		};

		this.findPartForClick = function(canvas, e) {
			
			var _ = this.getUnscaledXYforCanvas(canvas, e);
			var y = _[0];
			var x = _[1];
			
			var scalingFunction = this.estimateStreamHeight()/$(canvas).height();
			var scaledY = y * scalingFunction;
			var partNum = Math.floor(scaledY / this.partSpacing);
			var scaledYinPart = scaledY - partNum * this.partSpacing;
			

			var systemIndex = undefined;
			if (partNum >= this.length) {
				systemIndex = Math.floor(partNum/this.length);
				partNum = partNum % this.length;
			}
			if (music21.debug) {
				console.log(y + " scaled = " + scaledY + " part Num: " + partNum + " scaledYinPart: " + scaledYinPart + " systemIndex: " + systemIndex);
			}
			var rightPart = this.elements[partNum];
			var clickedDiatonicNoteNum = rightPart.diatonicNoteNumFromScaledY(scaledYinPart);
			
			var scaledX = x * scalingFunction;
			var foundNote = rightPart.noteElementFromScaledX(scaledX, undefined, scaledYinPart, systemIndex);
			return [clickedDiatonicNoteNum, foundNote];
		};
		
		this.canvasChangerFunction = function (e) {
			/* N.B. -- not to be called on a stream -- "this" refers to the CANVAS
			
				var can = s.appendNewCanvas();
				$(can).on('click', s.canvasChangerFunction);
			
			*/
			var ss = this.storedStream;
			var _ = ss.findPartForClick(this, e),
				 clickedDiatonicNoteNum = _[0],
				 foundNote = _[1];
			return ss.noteChanged(clickedDiatonicNoteNum, foundNote, this);
		};

		this.numSystems = function () {
			return this.elements[0].numSystems();
		};

		
		this.evenPartMeasureSpacing = function () {
			var measureStacks = [];
			var currentPartNumber = 0;
			var maxMeasureWidth = [];

			for (var i = 0; i < this.length; i++) {
				var el = this.elements[i];
				if (el.inClass('Part')) {
					var measureWidths = el.getMeasureWidths();
					for (var j = 0; j < measureWidths.length; j++) {
						thisMeasureWidth = measureWidths[j];
						if (measureStacks[j] == undefined) {
							measureStacks[j] = [];
							maxMeasureWidth[j] = thisMeasureWidth;
						} else {
							if (thisMeasureWidth > maxMeasureWidth[j]) {
								maxMeasureWidth[j] = thisMeasureWidth;
							}
						}
						measureStacks[j][currentPartNumber] = thisMeasureWidth;
					}
					currentPartNumber++;
				}
			}
			var currentLeft = 20;
			for (var i = 0; i < maxMeasureWidth.length; i++) {
				// TODO: do not assume, only elements in Score are Parts and in Parts are Measures...
				var measureNewWidth = maxMeasureWidth[i];
				for (var j = 0; j < this.length; j++) {
					var part = this.elements[j];
					var measure = part.elements[i];
					var vfro = measure.renderOptions;
					vfro.width = measureNewWidth;
					vfro.left = currentLeft;
				}
				currentLeft += measureNewWidth;
			}
		};
		
		this.addStaffConnectors = function (renderer) {
			var numParts = this.length;
			if (numParts < 2) {
				return;
			}
			staffConnectorsMap = {
					'brace': Vex.Flow.StaveConnector.type.BRACE, 
					'single': Vex.Flow.StaveConnector.type.SINGLE, 
					'double': Vex.Flow.StaveConnector.type.DOUBLE, 
					'bracket': Vex.Flow.StaveConnector.type.BRACKET, 
			};
			var firstPart = this.elements[0];
			var lastPart = this.elements[numParts - 1];
			var numMeasures = firstPart.length;
			for (var mIndex = 0; mIndex < numMeasures; mIndex++) {
				var thisPartMeasure = firstPart.elements[mIndex];
				if (thisPartMeasure.renderOptions.startNewSystem) {
					var topVFStaff = thisPartMeasure.activeVFStave;
					var bottomVFStaff = lastPart.elements[mIndex].activeVFStave;
					/* TODO: warning if no staves... */;
					for (var i = 0; i < this.renderOptions.staffConnectors.length; i++) {
						var sc = new Vex.Flow.StaveConnector(topVFStaff, bottomVFStaff);
						var scTypeM21 = this.renderOptions.staffConnectors[i];
						var scTypeVF = staffConnectorsMap[scTypeM21];
						sc.setType(scTypeVF);
						sc.setContext(renderer.getContext()).draw();
					}
				}
			}
		};
	};

	stream.Score.prototype = new stream.Stream();
	stream.Score.prototype.constructor = stream.Score;

	stream.tests = function () {
	    test( "music21.stream.Stream", function() {
	        var s = new music21.stream.Stream();
	        s.append( new music21.note.Note("C#5"));
	        s.append( new music21.note.Note("D#5"));
	        var n =  new music21.note.Note("F5");
	        n.duration.type = 'half';
	        s.append(n);
	        equal (s.length, 3, "Simple stream length");
	    });

       test( "music21.stream.Stream.duration", function() {
            var s = new music21.stream.Stream();
            equal (s.duration.quarterLength, 0, "EmptyString QuarterLength");
            s.append( new music21.note.Note("C#5"));
            equal (s.duration.quarterLength, 1.0, "1 quarter QuarterLength");
            var n =  new music21.note.Note("F5");
            n.duration.type = 'half';
            s.append(n);
            equal (s.duration.quarterLength, 3.0, "3 quarter QuarterLength");
            s.duration = new music21.duration.Duration(3.0);
            s.append( new music21.note.Note("D#5"));
            equal (s.duration.quarterLength, 3.0, "overridden duration -- remains");
        });

	    
	    test( "music21.stream.Stream.canvas", function() {
	        var s = new music21.stream.Stream();
	        s.append( new music21.note.Note("C#5"));
	        s.append( new music21.note.Note("D#5"));
	        var n =  new music21.note.Note("F5");
	        n.duration.type = 'half';
	        s.append(n);
	        var c = s.createNewCanvas({}, 100, 50);
	        equal (c.attr('width'), 100, 'stored width matches');
	        equal (c.attr('height'), 50, 'stored height matches');
	    });  
	};
	
	// end of define
	if (typeof(music21) != "undefined") {
		music21.stream = stream;
	}		
	return stream;
});