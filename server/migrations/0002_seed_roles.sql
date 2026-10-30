INSERT INTO roles (name) VALUES
    ('Admin'),
    ('Operator'),
    ('Viewer');

INSERT INTO permissions (name) VALUES
    ('users.read'),
    ('users.create'),
    ('users.update'),
    ('users.delete'),
    ('roles.manage');

INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
CROSS JOIN permissions
WHERE roles.name = 'Admin';

INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
CROSS JOIN permissions
WHERE roles.name = 'Operator'
AND permissions.name IN (
    'users.read',
    'users.create',
    'users.update'
);

INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
CROSS JOIN permissions
WHERE roles.name = 'Viewer'
AND permissions.name = 'users.read';
