let map;
let directionsService;
let directionsRenderer;
let trafficLayer;
let autocompleteStart;
let autocompleteEnd;
let markers = [];
let polylines = [];
let busMarkers = [];
let geocoder;

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 22.5744, lng: 88.3629 }, // Default center Kolkata
        zoom: 12,
        styles: [
            { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
            { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
            { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
            { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#bdbdbd' }] },
            { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
            { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
            { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
            { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#f8cdd6' }] },
            { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
            { featureType: 'transit', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
            { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#e3f2fd' }] }
        ]
    });

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();
    directionsRenderer.setMap(map);

    trafficLayer = new google.maps.TrafficLayer();

    autocompleteStart = new google.maps.places.Autocomplete(document.getElementById('start'));
    autocompleteEnd = new google.maps.places.Autocomplete(document.getElementById('end'));

    geocoder = new google.maps.Geocoder();

    addBusMarkers(busMarkers);
}

function addBusMarkers(locations) {
    locations.forEach(location => {
        const marker = new google.maps.Marker({
            position: location,
            map: map,
            title: 'Bus Stop',
            icon: 'http://maps.google.com/mapfiles/ms/icons/bus.png' // Use a bus icon
        });
        busMarkers.push(marker);
    });
}

function calculateRoutes() {
    const start = document.getElementById('start').value;
    const end = document.getElementById('end').value;

    if (!start || !end) {
        alert('Please enter both start and end locations');
        return;
    }

    const request = {
        origin: start,
        destination: end,
        travelMode: google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: true,
        drivingOptions: {
            departureTime: new Date(),  // Specifies the desired time of departure.
            trafficModel: 'bestguess'   // Other options: 'optimistic', 'pessimistic'
        }
    };

    directionsService.route(request, function(result, status) {
        if (status === google.maps.DirectionsStatus.OK) {
            displayRoutes(result);
        } else {
            alert('Failed to get routes: ' + status);
        }
    });
}

function displayRoutes(result) {
    const routes = result.routes;
    const routeList = document.getElementById('routeList');
    routeList.innerHTML = '';

    markers.forEach(marker => marker.setMap(null));
    markers = [];
    polylines.forEach(polyline => polyline.setMap(null));
    polylines = [];

    const startLocation = result.routes[0].legs[0].start_location;
    const endLocation = result.routes[0].legs[0].end_location;

    markers.push(new google.maps.Marker({
        position: startLocation,
        map: map,
        title: 'Start',
        icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
    }));

    markers.push(new google.maps.Marker({
        position: endLocation,
        map: map,
        title: 'End',
        icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
    }));

    routes.sort((a, b) => {
        const distanceA = a.legs[0].distance.value;
        const distanceB = b.legs[0].distance.value;
        const trafficLevelA = getTrafficLevel(a);
        const trafficLevelB = getTrafficLevel(b);

        if (distanceA === distanceB) {
            return trafficLevelA - trafficLevelB;
        }
        return distanceA - distanceB;
    });

    let optimalRouteIndex = 0;

    routes.forEach((route, index) => {
        const routeInfo = document.createElement('div');
        const routeDistance = route.legs[0].distance.text;
        const routeDuration = route.legs[0].duration.text;
        const trafficCondition = getTrafficLevel(route);

        //
        fetchPredictedDuration(route, index, routeInfo);
        //

        //
        routeInfo.className = 'route-info';
        routeInfo.innerHTML = `
          <h3>Route ${index + 1} ${index === optimalRouteIndex ? '<span style="color: #28a745;">(Optimal)</span>' : ''}</h3>
          <p>Distance: ${routeDistance}</p>
          <p>Duration: ${routeDuration}</p>
           <p>Traffic Condition: ${trafficCondition}/10</p> 
           <p>Predicted Duration: <span id="predictedDurationValue-${index}"></span><//p>
        `;

        routeInfo.addEventListener('click', () => {
            showRoute(index);document.querySelector('#routesContainer').appendChild(routeInfo);

        });

        routeList.appendChild(routeInfo);

        const polyline = new google.maps.Polyline({
            path: route.overview_path,
            strokeColor: getRouteColor(index),
            strokeOpacity: 0.7,
            strokeWeight: 5
        });
        polyline.setMap(map);
        polylines.push(polyline);
    });

    const bounds = new google.maps.LatLngBounds();
    routes.forEach(route => {
        route.overview_path.forEach(point => {
            bounds.extend(point);
        });
    });
    map.fitBounds(bounds);
}

function fetchPredictedDuration(route, index, routeInfo) {
    const currentTime = new Date();
    const hour = currentTime.getHours();
    const dayOfWeek = currentTime.getDay();

    fetch('/api/get_predicted_duration', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            hour: hour,
            day_of_week: dayOfWeek,
            distance: route.legs[0].distance.value,
            duration_in_traffic: route.legs[0].duration_in_traffic ? route.legs[0].duration_in_traffic.value : route.legs[0].duration.value
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json(); // Proceed to parse only if the response is OK
    })
    .then(data => {
        console.log(data); // Proceed with your logic here
    })
    .catch(error => {
        console.error('Error fetching predicted duration:', error);
    });
    
}

function formatDuration(durationInSeconds) {
    const hours = Math.floor(durationInSeconds / 3600);
    const minutes = Math.floor((durationInSeconds % 3600) / 60);
    const seconds = durationInSeconds % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
}
function calculateRouteAndTrafficLevel(origin, destination, apiKey) {

    const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&departure_time=now&key=${apiKey}`;

    // Fetch the route data with traffic information
    fetch(directionsUrl)
        .then(response => response.json())
        .then(data => {
            const route = data.routes[0];  // Get the first route
            const trafficLevel = getTrafficLevel(route);
            console.log(`Traffic level: ${trafficLevel}/10`);
        })
        .catch(error => {
            console.error('Error fetching directions:', error);
        });
}


// function getTrafficLevel(route) {
//     const durationInTraffic = route.legs[0].duration_in_traffic ? route.legs[0].duration_in_traffic.value : route.legs[0].duration.value;
//     const regularDuration = route.legs[0].duration.value;

//     // Calculate traffic ratio
//     const trafficRatio = durationInTraffic / regularDuration;

//     // If there's no significant traffic, keep a lower bound on traffic level
//     let trafficLevel = Math.round((trafficRatio - 1) * 10);

//     // Ensure trafficLevel is between 1 and 10
//     trafficLevel = Math.min(Math.max(trafficLevel, 1), 10); 

//     return trafficLevel;
// }
function getTrafficLevel(route) {
    // Use duration_in_traffic if available, otherwise fall back to duration
    const durationInTraffic = route.legs[0].duration_in_traffic ? route.legs[0].duration_in_traffic.value : route.legs[0].duration.value;
    const regularDuration = route.legs[0].duration.value;

    // Calculation
    const trafficRatio = durationInTraffic / regularDuration;

    
    let trafficLevel;

    if (trafficRatio <= 1.1) {
        trafficLevel = 1; // Very light traffic
    } else if (trafficRatio <= 1.25) {
        trafficLevel = 3; // Light traffic
    } else if (trafficRatio <= 1.5) {
        trafficLevel = 5; // Moderate traffic
    } else if (trafficRatio <= 1.75) {
        trafficLevel = 7; // Heavy traffic
    } else {
        trafficLevel = 10; // Severe traffic
    }

    return trafficLevel;
}




function showRoute(routeIndex) {
    polylines.forEach(polyline => polyline.setMap(null));
    polylines[routeIndex].setMap(map);
}

function resetMap() {
    document.getElementById('start').value = '';
    document.getElementById('end').value = '';
    document.getElementById('routeList').innerHTML = '';
    markers.forEach(marker => marker.setMap(null));
    markers = [];
    polylines.forEach(polyline => polyline.setMap(null));
    polylines = [];
    busMarkers.forEach(marker => marker.setMap(null));
    busMarkers = [];
    map.setCenter({ lat: 22.5744, lng: 88.3629 });
    map.setZoom(12);

    addBusMarkers(busMarkersData);
}

function refreshStatus() {
    alert('Status refreshed');
}

function changeMapType() {
    const mapType = document.getElementById('mapType').value;
    map.setMapTypeId(mapType);
}

function toggleTrafficLayer() {
    if (trafficLayer.getMap()) {
        trafficLayer.setMap(null);
    } else {
        trafficLayer.setMap(map);
    }
}

function zoomIn() {
    map.setZoom(map.getZoom() + 1);
}

function zoomOut() {
    map.setZoom(map.getZoom() - 1);
}

function getRouteColor(index) {
    switch (index) {
        case 0: return '#28a745'; // Green for the optimal route
        case 1: return '#ffc107'; // Yellow for the medium traffic route
        case 2: return '#dc3545'; // Red for the high traffic route
        default: return '#007bff'; // Blue for any other routes
    }
}
////////
function calculateRoutes() {
    const start = document.getElementById('start').value;
    const end = document.getElementById('end').value;

    if (!start || !end) {
        alert('Please enter both start and end locations');
        return;
    }

    const request = {
        origin: start,
        destination: end,
        travelMode: google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: true,
        drivingOptions: {
            departureTime: new Date(),
            trafficModel: 'bestguess'
        }
    };

    directionsService.route(request, function(result, status) {
        if (status === google.maps.DirectionsStatus.OK) {
            displayRoutes(result);
        } else {
            alert('Failed to get routes: ' + status);
        }
    });
}



