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
        center: { lat: 22.5744, lng: 88.3629 }, // Default center KOLKATA
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

    addBusMarkers([
        "Acropolis Mall, Kolkata",
        "Kasba, Kolkata",
        "Salt Lake, Kolkata",
        "Park Street, Kolkata",
        "Garia, Kolkata"
    ]);
    
}

function addBusMarkers(locations) {
    locations.forEach(location => {
        geocoder.geocode({ address: location }, function(results, status) {
            if (status === google.maps.GeocoderStatus.OK) {
                const marker = new google.maps.Marker({
                    position: results[0].geometry.location,
                    map: map,
                    title: location,
                    icon: 'http://maps.google.com/mapfiles/ms/icons/bus.png' // Use a bus icon
                });
                busMarkers.push(marker);
            } else {
                console.error('Geocode was not successful for the following reason: ' + status);
            }
        });
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

    // Sort routes first by distance and then by traffic level
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

        routeInfo.className = 'route-info';
        routeInfo.innerHTML = `
          <h3>Route ${index + 1} ${index === optimalRouteIndex ? '<span style="color: #28a745;">(Optimal)</span>' : ''}</h3>
          <p>Distance: ${routeDistance}</p>
          <p>Duration: ${routeDuration}</p>
          <p>Traffic Condition: ${trafficCondition}/10</p>
        `;

        routeInfo.addEventListener('click', () => {
            showRoute(index);
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

function getTrafficLevel(route) {
    const durationInTraffic = route.legs[0].duration_in_traffic.value;
    const regularDuration = route.legs[0].duration.value;

    const trafficRatio = durationInTraffic / regularDuration;

    let trafficLevel = Math.floor((trafficRatio - 1) * 10);
    trafficLevel = Math.min(Math.max(trafficLevel, 1), 10); // Ensuring the level is between 1 and 10

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

    // Re-add bus markers after reset
    addBusMarkers([
        "Jadavpur, Kolkata",
        "Ruby General Hospital, Kolkata",
        "Kalikapur, Kolkata",
        "Sahid Nagar, Kolkata",
        "Garia, Kolkata"
    ]);
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
    const colors = ['#FF0000', '#00FF00', '#0000FF'];
    return colors[index % colors.length];
}

function callAIModel(route) {
    return Math.random() > 0.5 ? 'Yes' : 'No';
}
