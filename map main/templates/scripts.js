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
        center: { lat: 12.9716, lng: 77.5946 }, // Default center (Bengaluru, India)
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

    const routeRequests = routes.map((route, index) => ({
        routeIndex: index,
        distance: route.legs[0].distance.value,
        duration: route.legs[0].duration.value,
        duration_in_traffic: route.legs[0].duration_in_traffic ? route.legs[0].duration_in_traffic.value : route.legs[0].duration.value
    }));

    fetch('/api/get_routes', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ routes: routeRequests })
    })
    .then(response => response.json())
    .then(data => {
        data.forEach((route, index) => {
            const routeInfo = document.createElement('div');
            const routeDistance = (route.distance / 1000).toFixed(2) + ' km'; // Convert to km
            const routeDuration = (route.duration / 60).toFixed(2) + ' min'; // Convert to min
            const trafficCondition = route.predicted_congestion ? 'Congested' : 'Clear';

            routeInfo.className = 'route-info';
            routeInfo.innerHTML = `
                <h3>Route ${index + 1} ${index === 0 ? '(Optimal)' : ''}</h3>
                <p>Distance: ${routeDistance}</p>
                <p>Duration: ${routeDuration}</p>
                <p>Traffic Condition: ${trafficCondition}</p>
            `;

            routeInfo.addEventListener('click', () => {
                routeInfo.classList.toggle('active');
                if (routeInfo.classList.contains('active')) {
                    displayRoute(index);
                } else {
                    polylines[index].setMap(null);
                }
            });

            routeList.appendChild(routeInfo);
            displayRoute(index);
        });
    })
    .catch(error => console.error('Error fetching data:', error));
}

function displayRoute(index) {
    const route = directionsRenderer.getDirections().routes[index];
    const polyline = new google.maps.Polyline({
        path: route.overview_path,
        geodesic: true,
        strokeColor: index === 0 ? '#FF0000' : '#0000FF',
        strokeOpacity: 1.0,
        strokeWeight: 3
    });

    polyline.setMap(map);
    polylines[index] = polyline;
}

function resetMap() {
    document.getElementById('start').value = '';
    document.getElementById('end').value = '';
    document.getElementById('routeList').innerHTML = '';
    markers.forEach(marker => marker.setMap(null));
    markers = [];
    polylines.forEach(polyline => polyline.setMap(null));
    polylines = [];
    map.setCenter({ lat: 12.9716, lng: 77.5946 });
    map.setZoom(12);
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
    const currentZoom = map.getZoom();
    map.setZoom(currentZoom + 1);
}

function zoomOut() {
    const currentZoom = map.getZoom();
    map.setZoom(currentZoom - 1);
}
