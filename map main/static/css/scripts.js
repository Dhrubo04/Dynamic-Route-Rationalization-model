let map;
let directionsService;
let directionsRenderer;
let trafficLayer;
let autocompleteStart;
let autocompleteEnd;
let markers = [];
let polylines = [];
let currentRoutes = [];

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 22.5726, lng: 88.3639 }, // Default center (Kolkata, India)
        zoom: 12
    });

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();
    directionsRenderer.setMap(map);

    trafficLayer = new google.maps.TrafficLayer();

    autocompleteStart = new google.maps.places.Autocomplete(document.getElementById('start'));
    autocompleteEnd = new google.maps.places.Autocomplete(document.getElementById('end'));
}

function calculateRoutes() {
    const start = document.getElementById('start').value;
    const end = document.getElementById('end').value;

    if (!start || !end) {
        alert('Please enter both start and end locations');
        return;
    }

    fetch(`/api/routes?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`)
        .then(response => response.json())
        .then(result => {
            if (result.error) {
                alert(result.error);
            } else {
                displayRoutes(result);
            }
        })
        .catch(error => {
            alert('Error fetching routes: ' + error.message);
        });
}


    const request = {
        origin: start,
        destination: end,
        travelMode: google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: true
    };

    directionsService.route(request, function(result, status) {
        if (status === google.maps.DirectionsStatus.OK) {
            displayRoutes(result);
        } else {
            alert('Failed to get routes: ' + status);
        }
    });

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

    routes.sort((a, b) => a.legs[0].duration.value - b.legs[0].duration.value);

    routes.forEach((route, index) => {
        const routeInfo = document.createElement('div');
        const routeDistance = route.legs[0].distance.text;
        const routeDuration = route.legs[0].duration.text;
        const trafficCondition = 'Fetching...';

        routeInfo.className = 'route-info';
        routeInfo.innerHTML = `
          <h3>Route ${index + 1}</h3>
          <p>Distance: ${routeDistance}</p>
          <p>Duration: ${routeDuration}</p>
          <p>Traffic Condition: ${trafficCondition}</p>
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
    map.setCenter({ lat: 22.5726, lng: 88.3639 });
    map.setZoom(12);
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
