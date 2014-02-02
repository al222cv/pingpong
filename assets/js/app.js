var app = angular.module('app', ['ngRoute', 'ngTouch'], function ($routeProvider) {
	$routeProvider.when('/', {
		controller: 'HomeCtrl',
		templateUrl: 'templates/home.html'
	})
	.when('/players', {
		controller: 'PlayersCtrl',
		templateUrl: 'templates/players.html'
	})
	.when('/game',{
		controller: 'GameCtrl',
		templateUrl: 'templates/game.html'
	})
	.otherwise({ redirectTo: '/' });
});

app.controller('HomeCtrl', function($scope, $player){
	$scope.newGame = function(){
		console.log('hoho');
	};
});

app.controller('PlayersCtrl', function($scope, $player){
	$player.getAll().then(function(data){
		$scope.players = data.rows.map(function(single){return single.value;});
	});

	$scope.addPlayer = function(){
		var player=prompt("Spelarens namn", null);
		player !=null && $player.create(player);
	};
});

app.controller('GameCtrl', function($scope, $player, $filter, $game){
	$scope.playersInGame = [];
	$player.getAll().then(function(data){
		$scope.players = data.rows.map(function(single){return single.value;});
	});

	//action functions
	$scope.togglePlayer = function(player){
		var indexOf = $filter('existsById')(player, $scope.playersInGame);
		if(indexOf == -1) {
			player.inGame = true;
			$scope.playersInGame.push(player);
		}
		else{
			delete player.inGame;
			$scope.playersInGame.splice(indexOf, 1);
		}
	};

	$scope.startGame = function(){
		if($scope.playersInGame.length <= 1) {
			alert('Turnering på en spelare? Hälvete va dum du är!');
			return;
		}
	}
});

app.directive('nav', function($location){
	return{
		restrict: 'E',
		link:function(scope){
			scope.goTo = function(url){
				scope.isOpen = false;
				$location.path(url);
			}
		}
	}
});

app.directive('wrapper', function(){
	return{
		restrict: 'C',
		link: function(scope){
			scope.closeIfOpen = function(){
				if(scope.isOpen){
					scope.isOpen = false;
					setTimeout(function(){}, 500);
				} 
			}
		}
	}
});

app.factory('$game', function(db){
	return {
		newGame: newGame,
		generateRounds: generateRounds
	};

	var rounds, remainingPlayers, totalPlayers;
	function newGame(players){
		rounds = generateRounds(players.length);
		remainingPlayers = players;
		totalPlayers = players;
	}

	function generateRounds (players) {
		var isOdd = players.length % 2 == true;
		var playersLeft = angular.copy(players.sort(function() { return .5 - Math.random();}));
		var matches = [];
		var matchCount = isOdd ? Math.floor(players.length / 2) - 1 : players.length / 2;

		for(var i = 0; i < matchCount; i++){
			var homePlayer = playersLeft.pop();
			var awayPlayer = playersLeft.pop();
			matches.push([homePlayer, awayPlayer]);
		}

		if(isOdd) matches.push(playersLeft);
	   	return matches;
	}
});

app.factory('$player', function(db){
	return {
		create: create,
		getAll: getAll,
		addGame: addGame
	};

	function create(name){
		if(!!!name) throw('You must enter a name');
		return db.post({type: 'player', name: name, games: 0, hcp: 0 });
	}

	function addGame(player){
		player = cleanup(player);
		player.games++;
		return db.put(player);
	}

	function getAll(){
		var map = function(doc){
			doc.type == 'player' && emit(doc.name, doc);
		};

		return db.query({map: map});
	}

	function cleanup(player){
		delete player.inGame;
		delete player.$$hashKey;
		return player;
	}
});

app.filter('existsById', function(){
  return function(item, items) {
    for (var index in items) {
      if (items[index]._id == item._id) {
        return index;
      }
    }
    return -1;
  }
});

app.factory('$exceptionHandler', function () {
  return function (exception, cause) {
    //TODO: Show error message!!
    console.log(exception, cause);
  };
});

app.provider('pouchdb', function() {
  	var slice = Array.prototype.slice;

    return {
      withAllDbsEnabled: function() {
        return PouchDB.enableAllDbs = true;
      },
      $get: function($q, $rootScope) {
        var qify = function(fn) {
          return function() {
            var args, callback, deferred;
            deferred = $q.defer();
            callback = function(err, res) {
              return $rootScope.$apply(function() {
                if (err) {
                  return deferred.reject(err);
                } else {
                  return deferred.resolve(res);
                }
              });
            };
            args = arguments != null ? slice.call(arguments) : [];
            args.push(callback);
            fn.apply(this, args);
            return deferred.promise;
          };
        };
        return {
          create: function(name, options) {
            var db = new PouchDB(name, options);
            return {
              put: qify(db.put),
              post: qify(db.post),
              get: qify(db.get),
              remove: qify(db.remove),
              bulkDocs: qify(db.bulkDocs),
              allDocs: qify(db.allDocs),
              changes: function(options) {
                var clone;
                clone = angular.copy(options);
                clone.onChange = function(change) {
                  return $rootScope.$apply(function() {
                    return options.onChange(change);
                  });
                };
                return db.changes(clone);
              },
              putAttachment: qify(db.putAttachment),
              getAttachment: qify(db.getAttachment),
              removeAttachment: qify(db.removeAttachment),
              query: qify(db.query),
              info: qify(db.info),
              compact: qify(db.compact),
              revsDiff: qify(db.revsDiff),
              replicateTo: qify(db.replicate.to),
              replicateFrom: qify(db.replicate.from)
            };
          },
          allDbs: qify(PouchDB.allDbs),
          destroy: qify(PouchDB.destroy),
          replicate: PouchDB.replicate
        };
      }
    };
});

app.factory('db', function(pouchdb, $rootScope) {
	var db = pouchdb.create('pingpong22');
	var remoteCouch = 'http://pingpong22.iriscouch.com/pingpong22';

	$rootScope.syncing = true;
	var opts = {continuous: true, complete: function(){
		$rootScope.syncing = false;
		console.log('error');	
	}};

	db.replicateTo(remoteCouch, opts);
	db.replicateFrom(remoteCouch, opts);

	return db;
});