app.controller('code', function code($scope, $rootScope, $timeout, scalaEval, fullscreen, snippets, user, throttle) {
	'use strict';
	var errorWidgetLines = [];
	var errorMarkedTexts = [];
	var cmLeft, cmRight = null;
	var viewingMySnippets = false;

	$scope.code = "";
	$scope.mySnippets = [];
	$scope.loggedIn = user.loggedIn;
	$scope.fetching = scalaEval.fetching;

	$rootScope.$on('selectedCode', function(event, code){
		if(code){
			$scope.code = [$scope.code, code].join('\n\n').trim();
		}
	});

	snippets.current().then(function(data){
		$scope.code = data.code;
	});

	$scope.fullscreen = function(){
		fullscreen.apply(true);
	}

	$scope.clear = function(){
		if(window.confirm("Clear code?")) {
			$scope.code = "";
		}
	}

	$scope.optionsCode = {
		extraKeys: {"Ctrl-Space": "autocomplete"},
		fixedGutter: false,
		lineNumbers: true,
		mode: 'text/x-scala',
		theme: 'solarized light',
		smartIndent: false,
		autofocus: true,
		autoCloseBrackets: true,
		highlightSelectionMatches: { showToken: false },
		onChange: function(cm) {
			snippets.saveLocal($scope.code);
			throttle.event(function() {
				scalaEval.insight($scope.code).then(function(data){
					$scope.insight = data.insight;
					if (data.output){
						if (!$scope.manuallyClosedConsole){
							$scope.withConsole = true;
						}
						$scope.console = data.output;
					}else{
						$scope.console = "";
					}

					clearErrorWidgetLines();
					clearErrorSquigglyLines();
					if (data.errors){
						data.errors.forEach(function(value) {	
							errorWidgetLines.push(addErrorWidgetLines(value));							
							errorMarkedTexts.push(addErrorSquigglyLines(value));
						});
					}
					/* Make the squiggly line in the code editor for error message */    
				    function addErrorSquigglyLines(value) {
				    	var cur = cm.getDoc().posFromIndex(value.position);
						var currentLine = $scope.code.split("\n")[cur.line];
				    	var markedText = cm.markText(
				    		{line: cur.line, ch: cur.ch}, 
				    		{line: cur.line, ch: currentLine.length},
				    		{className: "error"}
				    	);
						return markedText;
						
				  	}
				  	function clearErrorSquigglyLines(){
				  		errorMarkedTexts.forEach(function (value){
				  			value.clear();
				  		});
					    errorMarkedTexts = [];
				  	}
				  	function addErrorWidgetLines(value){
				  		var cur = cm.getDoc().posFromIndex(value.position);
						var currentLine = $scope.code.split("\n")[cur.line];
				  		var msg = document.createElement("div");
				      	var icon = msg.appendChild(document.createElement("i"));
				      	icon.className = "fa fa-exclamation-circle lint-error-icon";
				      	msg.appendChild(document.createTextNode(value.message));
				      	msg.className = "lint-error";
						var errorLineWidget = cm.addLineWidget(cur.line, msg);
						return errorLineWidget;
				  	}
				  	function clearErrorWidgetLines(){
				  		errorWidgetLines.forEach(function (value){
				  			cm.removeLineWidget(value);
				  		});
					    errorWidgetLines = [];
				  	}

				});
			});
		},
		onScroll: function(cm) {
			if ($scope.cmLeft === null) {
				$scope.cmLeft = cm;
			}

			var scrollLeftInfo = cm.getScrollInfo();
			if ($scope.cmRight !== null) {
				$scope.cmRight.scrollTo(null, scrollLeftInfo['top']);
			}
		},
		onLoad: function(cm) {
			$scope.cmLeft = cm;
		}
	};

	$scope.optionsInsight = {
		fixedGutter: false,
		lineNumbers: true,
		mode: 'text/x-scala',
		theme: 'solarized light',
		readOnly: 'nocursor',
		onScroll: function(cm) {
			var scrollRightInfo = cm.getScrollInfo();
			if($scope.cmRight === null) {
				$scope.cmRight = cm;
			}
			if ($scope.cmLeft !== null) {
				$scope.cmLeft.scrollTo(null, scrollRightInfo['top']);
			}
		},
		onLoad: function(cm) {
			$scope.cmRight = cm;
		}
	};

	function refreshMirrors(){
		$timeout(function() {
			$scope.cmLeft.refresh();
			$scope.cmRight.refresh();
		});
	}

	$scope.withInsight = true;
	$scope.toogleInsight = function() {
		$scope.withInsight = !$scope.withInsight;
		refreshMirrors();
	}

	$scope.publish = function(){
		if($scope.isSaving) return;

		user.afterSignIn(function(userName){
			$scope.isSaving = true;
			snippets.save({"code": $scope.code}).$promise.then(function(data){
				$scope.mySnippets = $scope.mySnippets.concat({
					"id": data.id,
					"code": $scope.code,
					"user": userName
				});
				$timeout(function() { $scope.isSaving = false; }, 1000);
			});
		});
	}

	$scope.hasSnippets = function(){
		return $scope.mySnippets.length > 0;
	}

	$scope.viewingMySnippets = function(){
		return user.loggedIn() && viewingMySnippets;
	}
	$scope.toogleMySnippets = function(){
		// login if need be
		$scope.mySnippets = snippets.queryUser();
		
		viewingMySnippets = !viewingMySnippets;
		refreshMirrors();
	}

	$scope.insertSnippet = function(snippet){
		$scope.code = $scope.code + '\n' + snippet.code;
	};

	$scope.deleteSnippet = function(snippet){
		if(window.confirm("Delete snippet?")) {
			snippets.delete({id: snippet.id});
			$scope.mySnippets = $scope.mySnippets.filter(function(s){
				return s != snippet;
			});
		}
	};

	$scope.withConsole = false;
	$scope.manuallyClosedConsole = false;
	$scope.toogleConsole = function() {
		$scope.withConsole = !$scope.withConsole;
		if (!$scope.withConsole){
			$scope.manuallyClosedConsole = true;
		}
		refreshMirrors();
	}	

	$scope.consoleIsEmpty = function () {
		return !$scope.console;
	}

	$scope.clearConsole = function() {
		$scope.console = "";
		$scope.lastExecutionOutput = "";
	}
});