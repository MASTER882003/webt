drop database if exists webt;
create database webt;
use webt;

create table equation (
    name VARCHAR(255) PRIMARY KEY,
    angle_unit VARCHAR(3),
    equation VARCHAR(255)
);

/* Insert some dummy data */
INSERT INTO equation (name, angle_unit, equation) VALUES
('Cubic', 'rad', 'x ** 3'),
('Cosinus', 'rad', 'cos(x)'),
('Sinus', 'rad', 'sin(x)');