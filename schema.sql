drop database if exists webt;
create database webt;
use webt;

create table equation (
    name VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(100),
    angle_unit VARCHAR(3),
    equation VARCHAR(255)
);
