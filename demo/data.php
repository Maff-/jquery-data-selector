<?php

$randDelays = array(10, 100, 200, 200, 300, 1000, 2000, 3000);
$randHolderStyles = array('sky', 'vine', 'lava', 'gray', 'industrial', 'social');

// Process input data (from POST or GET), or set defaults
$start = !empty($_REQUEST['start']) ? intval($_REQUEST['start']) : 0;
$limit = !empty($_REQUEST['limit']) ? intval($_REQUEST['limit']) : 10;
$draw = !empty($_REQUEST['draw']) ? intval($_REQUEST['draw']) : 0;

$filter = array();
if (!empty($_REQUEST['gender'])) {
    $filter['gender'] = $_REQUEST['gender'];
}

// limit the limit to 50 items :), just as an example
$limit = min(50, $limit);

// Load dummy data
$jsonData = file_get_contents(__DIR__ . DIRECTORY_SEPARATOR . 'muchdata.json');
$data = json_decode($jsonData, true);

// Get totals
$recordsTotal = count($data);

// filter records
$data = array_filter($data, function ($row) {
    global $filter;
    foreach ($filter as $field => $val) {
        if ($row[$field] != $val) {
            return false;
        }
    }
    return true;
});
$recordsFiltered = count($data);

// Slice data based of start and limit
$data = array_slice($data, $start, $limit);
$recordsReturned = count($data);

// Replace picture property with holder.js
foreach ($data as &$row) {
    list($fg, $bg) = randColor($row['id']);
    $row['picture'] = "holder.js/80x80/#$fg:#$bg";
}

// delay if requested, to simulate database overhead
if (isset($_GET['delay'])) {
    if (empty($_GET['delay'])) {
        // random delay
        $delay = $randDelays[array_rand($randDelays)];
    } else {
        $delay = min(intval($_GET['delay']), 5000);
    }
    usleep($delay * 1000);
}

// Output data as JSON
header('Content-Type: application/json');
header('X-Request-Input: ' . json_encode($_REQUEST));
echo json_encode(compact('draw', 'recordsTotal', 'recordsFiltered', 'recordsReturned', 'data'), JSON_PRETTY_PRINT);
//echo json_encode($data, JSON_PRETTY_PRINT);


function randColor($seed = null)
{
    if ($seed !== null) srand($seed);
    $r = rand(0, 255);
    $g = rand(0, 255);
    $b = rand(0, 255);

    $l = (0.299 * $r) + (0.587 * $g) + (0.114 * $b);

    $fg = sprintf('%02x%02x%02x', $r, $g, $b);
    $bg = $l >= 128 ? '000000' : 'ffffff';
    return array($fg, $bg);
}