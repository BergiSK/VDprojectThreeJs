// menu handling
function createSliders() {
	$( "#slider-range-event-count" ).slider({
	  range: true,
	  min: 0,
	  max: maxClicks,
	  values: [ 0, maxClicks ],
	  slide: function( event, ui ) {
		$( "#amount" ).val( ui.values[ 0 ] + " - " + ui.values[ 1 ] );
	  }
	});
	$( "#amount" ).val( $( "#slider-range-event-count" ).slider( "values", 0 ) +
	  " - " + $( "#slider-range-event-count" ).slider( "values", 1 ) );
	  
	$( "#slider-range-event-duration" ).slider({
	  range: true,
	  min: 0,
	  max: maxTimeSpent,
	  values: [ 0, maxTimeSpent ],
	  slide: function( event, ui ) {
		$( "#duration" ).val( ui.values[ 0 ] + " - " + ui.values[ 1 ] );
	  }
	});
	$( "#duration" ).val( $( "#slider-range-event-duration" ).slider( "values", 0 ) +
	  " - " + $( "#slider-range-event-duration" ).slider( "values", 1 ) );
	  
	$( "#slider-range-event-size" ).slider({
	  range: "max",
	  min: 20,
	  max: 50,
	  step: 5,
	  value: 50,
	  slide: function( event, ui ) {
		$( "#size" ).val( ui.value );
		resizeEvents(ui.value);					
	  }
	});
	$( "#size" ).val( $( "#slider-range-event-size" ).slider( "value" ) );
} 

function initSelect() {
	
	$('#sessions').find('option').remove().end();				
	$( "#sessions" ).selectmenu({
	  select: function( event, ui ) {
		
		var prevState = $( "#sessions" ).data('pre');
		$( "#sessions" ).data('pre', $( "#sessions" ).prop('selectedIndex')-1);
		
		highlightSession(ui.item.index-1);
		removeSessionHighlight(prevState);
		
		if (ui.item.index-1 >= 0) {
			var totalTime = countSessionTotalTime(ui.item.index-1);
			var eventNum = data[ui.item.index-1].number;
			var avgTime = totalTime/eventNum;
		
			$('.sessionId').text(data[ui.item.index-1]._id.sessionId);
			$('.numEvents').text(eventNum);
			$('.totalTime').text(totalTime);
			$('.avgTime').text(avgTime.toFixed(2));
			
			buildAlternativeSessionView(ui.item.index-1, totalTime);
		} else {
			$('.sessionId').text("-");
			$('.numEvents').text("-");
			$('.totalTime').text("-");
			$('.avgTime').text("-");
			buildAlternativeSessionView(-1,0);
		}
		
		renderSessionView();
		//console.log(prevState, ui.item.index-1);
	  }
	});
	var select = document.getElementById( 'sessions' );
	

	option = document.createElement( 'option' );
	select.add( option );
	
	for ( i = 0; i < getNumberOfSessionsToShow(); i++ ) {
		option = document.createElement( 'option' );
		option.value = option.text = 'Session ' + i;
		select.add( option );
	}
	$('#sessions').data('pre', $('#sessions').prop('selectedIndex')-1);
	$( "#sessions" ).selectmenu("refresh");
}

function updateEventCounts() {
	$('.list .liContent .count').text("("+ eventCounts['list'] +")");
	$('.view .liContent .count').text("("+ eventCounts['view'] +")");
	$('.basket .liContent .count').text("("+ eventCounts['basket'] +")");
	$('.purchaseProcessed .liContent .count').text("("+ eventCounts['purchase_processed'] +")");
	$('.search .liContent .count').text("("+ eventCounts['search'] +")");
	$('.rating .liContent .count').text("("+ eventCounts['rating'] +")");
}

function rotateCameraTop() {
	var ySize = Math.ceil(maxTimeSpent * 1.2/squareEdgeSize) * squareEdgeSize;
	var zSize = getNumberOfSessionsToShow() * squareEdgeSize;
	var xSize = maxClicks * squareEdgeSize;
	

	// position camera
	camera.position.set(xSize/2, ySize*1.5, -400);
	controls.target.set(xSize/2, 0, zSize);
	controls.update();	
	
	render();
}
function rotateCameraX() {
	var xSize = maxClicks * squareEdgeSize;
	
	// position camera
	camera.position.set(xSize/2, 600, -1300);
	controls.target.set(xSize/2, 0, 300);
	controls.update();
		
	render();
}
function rotateCameraZ() {
	var zSize = getNumberOfSessionsToShow() * squareEdgeSize;
	
	// position camera
	camera.position.set(-1300,600, zSize/2);
	controls.target.set(xSize,0, zSize/2);
	controls.update();

	render();
}

function swapSessions( direction ) {
	var updated = 0;
	if (direction) {
		if (minSessionNumber + step < sessionCount) {
			minSessionNumber += step;
			if (maxSessionNumber + step > sessionCount) {maxSessionNumber = sessionCount;}
			else {maxSessionNumber += step;}
			updated++;
		}	
	} else {
		if (minSessionNumber - step >= 0) {
			maxSessionNumber = minSessionNumber - 1;
			minSessionNumber -= step;						
			updated++;
		}				
	}
	
	if (updated) {
		rebuildVisualization([], 0, 9999, null, null, 1);
		updateShownSessionNumbers();
	}

}

function updateShownSessionNumbers() {
	$('.shownSessions').text(minSessionNumber +" - " + maxSessionNumber);
}

function filterWrap() {
	
	if ($( ".filterContent" ).hasClass( "hidden" )) {
		$( ".filter i" ).removeClass( "fa-chevron-down" );
		$( ".filter i" ).addClass( "fa-chevron-up" );
		$( ".filterContent" ).removeClass( "hidden" );
		$( ".filterContent" ).removeClass( "hidden" );
	} else {
		$( ".filter i" ).addClass( "fa-chevron-down" );
		$( ".filter i" ).removeClass( "fa-chevron-up" );
		$( ".filterContent" ).addClass( "hidden" );
	}
}

function sessionWrap() {	
	if ($( ".sessionContent" ).hasClass( "hidden" )) {
		$( ".sessions i" ).removeClass( "fa-chevron-down" );
		$( ".sessions i" ).addClass( "fa-chevron-up" );
		$( ".sessionContent" ).removeClass( "hidden" );
		$( ".sessionContent" ).removeClass( "hidden" );
	} else {
		$( ".sessions i" ).addClass( "fa-chevron-down" );
		$( ".sessions i" ).removeClass( "fa-chevron-up" );
		$( ".sessionContent" ).addClass( "hidden" );
	}
}	

function eventsWrap() {	
	if ($( ".visualMapping" ).hasClass( "hidden" )) {
		$( ".events i" ).removeClass( "fa-chevron-down" );
		$( ".events i" ).addClass( "fa-chevron-up" );
		$( ".visualMapping" ).removeClass( "hidden" );
		$( ".visualMapping" ).removeClass( "hidden" );
	} else {
		$( ".events i" ).addClass( "fa-chevron-down" );
		$( ".events i" ).removeClass( "fa-chevron-up" );
		$( ".visualMapping" ).addClass( "hidden" );
	}
}