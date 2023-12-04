<?php

// Util
// -----------------------
function get($name, $default = NULL) {
    return $_GET[$name] ?? $default;
}

function post($name, $default = NULL) {
    return $_POST[$name] ?? $default;
}

function respond($data = NULL, $statusCode = 200) {
    http_response_code($statusCode);

    if (!is_null($data)) {
        die(json_encode([
            'data' => $data
        ]));
    }

    die();
}

// Database
class Database {

    private PDO $connection;

    public function __construct() {
        try {
            $this->connection = new PDO("mysql:host=localhost;dbname=webt", "root", "");
        } catch (PDOException $e) {
            respond([
                'error' => 'Database connection failed'
            ], 500);
        }
    }


    public function query($sql, $params = []) {
        // Prepare statement
        $stmt = $this->connection->prepare($sql);
       
        // Assign params
        foreach ($params as $key => $value) {
            $stmt->bindParam($key, $value);
        }

        // Execute
        $stmt->execute();

        // If its a select -> return result
        if (str_starts_with(strtoupper($sql), 'SELECT')) {
            return $stmt->fetchAll();
        }
    }
}

// Validation
$validationRules = [
    'required' => [
        'validator' => fn ($value) => !empty($value),
        'message' => 'The field {label} is required!'
    ],
    'numeric' => [
        'validator' => fn ($value) => is_numeric($value),
        'message' => 'The field {label} has to be numeric'
    ],
    'integer' => [
        'validator' => fn ($value) => is_int($value),
        'message' => 'The field {label} has to be an integer'
    ],
    'hex_code' => [
        'validator' => fn ($value) => preg_match('/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/', $value) > 0,
        'message' => '{label} is not a valid hexcode'
    ]
];

function validate($value, $rules, $label, $dieOnError = FALSE) {
    global $validationRules;

    $errors = [];

    foreach ($rules as $rule) {
        if (is_string($rule)) {
            $rule = $validationRules[$rule];
        }

        if (is_callable($rule)) {
            $result = $rule($value);

            if (is_string($result)) {
                $errors[] = $result;
            }
        }
        else if (!$rule['validator']($value)) {
            $errors[] = str_replace('{label}', $label, $rule['message']);
        }
    }

    if ($dieOnError && !empty($errors)) {
        respond(['errors' => $errors], 400);
    }

    return $errors;
}

// Actions (Routing)
// ---------------------------
$actions = [
    'save_color' => function () {
        
        $color = post('color');
        validate($color, ['required', 'hex_code'], 'Color', TRUE);

        // Save as cookie
        setcookie('color', $color, strtotime('+1 year'));

        // OK
        respond(['success' => TRUE]);
    },
    'get_color' => function () {
        $color = $_COOKIE['color'] ?? '#0f9fbf';

        respond(['color' => $color]);
    },
    'exequte_equation' => function () {

    },
];

// Execute routing
// ---------------------------

// Get the requested action
$action = get('action', post('action'));

// Check if it exists
if (!array_key_exists($action, $actions)) {
    respond(NULL, 404);
}

// Execute action
$actions[$action]();