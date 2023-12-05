<?php

// Settings
$angleUnit = 'rad';

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

function setAngleUnit($unit) {
    global $angleUnit;

    $angleUnit = $unit;
}

function getEquation($name) {
    return query('SELECT * FROM equation WHERE name = :name', ['name' => $name])[0] ?? NULL;
}


// Database
// -------------------

// Initialize connection
try {
    $connection = new PDO("mysql:host=localhost;dbname=webt", "root", "");
} catch (PDOException $e) {
    respond([
        'error' => 'Database connection failed'
    ], 500);
}

function query($sql, $params = NULL) {
    global $connection;

    // Prepare statement
    $stmt = $connection->prepare($sql);
   
    try {
        // Execute
        $stmt->execute($params);
    } catch (PDOException $e) {
        return FALSE;
    }

    // If its a select -> return result
    if (str_starts_with(strtoupper($sql), 'SELECT')) {
        return $stmt->fetchAll();
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


function validate($data, $fields, $dieOnError = FALSE) {
    global $validationRules;

    $errors = [];

    foreach ($fields as $name => $options) {

        $value = $data[$name] ?? NULL;

        foreach ($options['rules'] as $rule) {
            if (is_string($rule)) {
                $rule = $validationRules[$rule];
            }
    
            if (is_callable($rule)) {
                $result = $rule($value);
    
                if (is_string($result)) {
                    if (empty($errors[$name])) {
                        $errors[$name] = [str_replace('{label}', $options['label'], $result)];
                    } else {
                        $errors[$name][] = str_replace('{label}', $options['label'], $result);
                    }
                }
            }
            else if (!$rule['validator']($value)) { 
                if (empty($errors[$name])) {
                    $errors[$name] = [str_replace('{label}', $options['label'], $rule['message'])];
                } else {
                    $errors[$name][] = str_replace('{label}', $options['label'], $rule['message']);
                }
            }
        }
    }

    if ($dieOnError && !empty($errors)) {
        respond(['errors' => $errors], 400);
    }

    return !empty($errors) ? $errors : TRUE;
}


// Actions (Routing)
// ---------------------------
$actions = [
    'save_color' => function () {
        
        validate($_POST, [
            'color' => [
                'rules' => ['required', 'hex_code'],
                'label' => 'Color'
            ]
        ]);

        // Save as cookie
        setcookie('color', post('color'), strtotime('+1 year'));

        // OK
        respond(['success' => TRUE]);
    },
    'get_color' => function () {
        $color = $_COOKIE['color'] ?? '#0f9fbf';

        respond(['color' => $color]);
    },

    'get_equations' => fn () => respond(['equations' => query('SElECT * FROM equation')]),

    'get_equation' => function () {
        validate($_GET, [
            'name' => [
                'rules' => ['required']
            ]
        ], TRUE);

        $equation = query('SELECT * FROM equation WHERE name = :name', ['name' => get('name')])[0] ?? NULL;

        if (empty($equation)) respond(['error' => 'Not found'], 404);

        respond([
            'equation' => $equation,
            'plot' => executeEquation($equation['equation'], $equation['angle_unit'])
        ]);
    },

    'execute_equation' => function () {

        // Get data
        $angleUnit = post('angle_unit');
        $persist = post('persist', FALSE);
        $name = post('name');
        $equation = post('equation');

        // Build rules
        $rules = [
            'angle_unit' => [
                'rules' => ['required', fn ($value) => in_array($value, ['rad', 'deg']) ? TRUE : 'The Angle unit can only be deg or rad.'],
                'label' => 'Angle unit'
            ],
            'equation' => [
                'rules' => ['required', fn ($value) => preg_match('/^(?:[x \(\)\*+-\/0-9]|sin|cos|tan|sqrt|%pi|%e)*$/', $value) ? TRUE : 'Not a valid equation'],
                'label' => 'Equation'
            ]
        ];

        // Name is required if we want to persist
        if ($persist) {
            $rules['name'] = [
                'rules' => ['required'],
                'label' => 'Name'
            ];
        }   

        // Validate
        validate($_POST, $rules, TRUE);
        
        $plot = executeEquation($equation, $angleUnit);

        if (!$plot) respond(['errors' => ['equation' => ['Your equations as an invalid syntax']]]);

        if ($persist) {
            query('REPLACE INTO `equation` (`name`, `angle_unit`, `equation`) VALUES (:name, :angle_unit, :equation)', [
                'name' => $name,
                'angle_unit' => $angleUnit,
                'equation' => $equation
            ]);
        }

        respond(['plot' => $plot]);
    },
];

function e_sin($value) {
    global $angleUnit;

    return $angleUnit == 'rad' ? sin($value) : sin(deg2rad($value));
}

function e_cos($value) {
    global $angleUnit;

    return $angleUnit == 'rad' ? cos($value) : cos(deg2rad($value));
}

function e_tan($value) {
    global $angleUnit;

    return $angleUnit == 'rad' ? tan($value) : tan(deg2rad($value));
}

function executeEquation($equation, $angleUnit = 'rad', $from = -20, $to = 20, $stepSize = 0.05) {
    setAngleUnit($angleUnit);

    $equation = str_replace(['x', '%pi', '%e', 'sin', 'cos', 'tan'], ['$x', 'M_PI', 'M_E', 'e_sin', 'e_cos', 'e_tan'], $equation);

    try {
        $fn = eval('return function ($x) {
                                try {
                                    return ' . $equation . ';
                                } catch (DivisionByZeroError $e) {
                                    return NULL;
                                }
                            };');
    } catch (ParseError $e) {
        return FALSE;
    }


    $plot = [];
    for ($x = $from; $x <= $to; $x += $stepSize) {
        $y = $fn($x);
        if (is_nan($y)) $y = NULL;

        $plot[] = [
            'x' => $x,
            'y' => $y
        ];
    }

    return $plot;
}

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

