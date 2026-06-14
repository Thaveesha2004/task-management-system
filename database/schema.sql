
-- ============================================================
-- This schema implements 10 normalized tables for a full-stack
-- Task Management System supporting Admin, Project Manager,
-- and Collaborator roles with real-time notifications.
-- ============================================================

-- ------------------------------------------------------------
-- 0. DATABASE CREATION
-- ------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS tms_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE tms_db;

-- ============================================================
-- 1. ROLES
-- ============================================================
-- Lookup table for system-wide user roles.
-- Normalized to avoid repeating role strings in the users table.
-- ------------------------------------------------------------
CREATE TABLE roles (
    id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    role_name   VARCHAR(50)     NOT NULL,

    -- Constraints
    PRIMARY KEY (id),
    CONSTRAINT uq_roles_role_name UNIQUE (role_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Lookup table for system user roles';


-- ============================================================
-- 2. USERS
-- ============================================================
-- Core identity table. Every authenticated actor in the system
-- maps to exactly one row here.
-- ------------------------------------------------------------
CREATE TABLE users (
    id              INT UNSIGNED        NOT NULL AUTO_INCREMENT,
    role_id         INT UNSIGNED        NOT NULL,
    full_name       VARCHAR(100)        NOT NULL,
    email           VARCHAR(255)        NOT NULL,
    password_hash   VARCHAR(255)        NOT NULL,
    is_first_login  BOOLEAN             NOT NULL DEFAULT TRUE,
    is_active       BOOLEAN             NOT NULL DEFAULT TRUE,
    profile_image   VARCHAR(500)        NULL DEFAULT NULL,
    created_at      TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Constraints
    PRIMARY KEY (id),
    CONSTRAINT uq_users_email    UNIQUE (email),
    CONSTRAINT fk_users_role     FOREIGN KEY (role_id)
        REFERENCES roles (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    -- Indexes
    INDEX idx_users_role_id      (role_id),
    INDEX idx_users_is_active    (is_active),
    INDEX idx_users_created_at   (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='System users with role-based access control';


-- ============================================================
-- 3. PASSWORD RESETS
-- ============================================================
-- Stores time-limited, single-use tokens for password recovery.
-- Tokens are hashed before storage for security.
-- ------------------------------------------------------------
CREATE TABLE password_resets (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    user_id         INT UNSIGNED    NOT NULL,
    reset_token     VARCHAR(255)    NOT NULL COMMENT 'Hashed reset token (SHA-256)',
    expires_at      TIMESTAMP       NOT NULL,
    used            BOOLEAN         NOT NULL DEFAULT FALSE,

    -- Constraints
    PRIMARY KEY (id),
    CONSTRAINT fk_pw_reset_user  FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    -- Indexes
    INDEX idx_pw_reset_user      (user_id),
    INDEX idx_pw_reset_token     (reset_token),
    INDEX idx_pw_reset_expires   (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Password reset tokens with expiration and single-use flag';


-- ============================================================
-- 4. PROJECTS
-- ============================================================
-- Top-level organizational unit. Each project is created by
-- a user (Admin or Project Manager) and contains tasks.
-- ------------------------------------------------------------
CREATE TABLE projects (
    id              INT UNSIGNED        NOT NULL AUTO_INCREMENT,
    project_name    VARCHAR(150)        NOT NULL,
    description     TEXT                NULL,
    created_by      INT UNSIGNED        NOT NULL,
    start_date      DATE                NULL,
    end_date        DATE                NULL,
    status          ENUM('Active', 'On Hold', 'Completed', 'Archived')
                                        NOT NULL DEFAULT 'Active',
    created_at      TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Constraints
    PRIMARY KEY (id),
    CONSTRAINT fk_projects_creator FOREIGN KEY (created_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT chk_projects_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),

    -- Indexes
    INDEX idx_projects_created_by (created_by),
    INDEX idx_projects_status     (status),
    INDEX idx_projects_dates      (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Projects — top-level containers for tasks';


-- ============================================================
-- 5. PROJECT MEMBERS
-- ============================================================
-- Junction table linking users to projects they participate in.
-- Enforces uniqueness so a user can only join a project once.
-- ------------------------------------------------------------
CREATE TABLE project_members (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    project_id      INT UNSIGNED    NOT NULL,
    user_id         INT UNSIGNED    NOT NULL,
    joined_at       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    PRIMARY KEY (id),
    CONSTRAINT uq_project_member UNIQUE (project_id, user_id),
    CONSTRAINT fk_pm_project     FOREIGN KEY (project_id)
        REFERENCES projects (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_pm_user        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    -- Indexes
    INDEX idx_pm_project         (project_id),
    INDEX idx_pm_user            (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Many-to-many relationship between projects and users';


-- ============================================================
-- 6. TASKS
-- ============================================================
-- Individual work items belonging to a project.
-- Each task has a priority level and a Kanban-style status.
-- ------------------------------------------------------------
CREATE TABLE tasks (
    id              INT UNSIGNED        NOT NULL AUTO_INCREMENT,
    project_id      INT UNSIGNED        NOT NULL,
    title           VARCHAR(200)        NOT NULL,
    description     TEXT                NULL,
    priority        ENUM('Low', 'Medium', 'High')
                                        NOT NULL DEFAULT 'Medium',
    status          ENUM('To Do', 'In Progress', 'Completed')
                                        NOT NULL DEFAULT 'To Do',
    due_date        DATE                NULL,
    created_by      INT UNSIGNED        NOT NULL,
    created_at      TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Constraints
    PRIMARY KEY (id),
    CONSTRAINT fk_tasks_project  FOREIGN KEY (project_id)
        REFERENCES projects (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_tasks_creator  FOREIGN KEY (created_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    -- Indexes
    INDEX idx_tasks_project      (project_id),
    INDEX idx_tasks_status       (status),
    INDEX idx_tasks_priority     (priority),
    INDEX idx_tasks_due_date     (due_date),
    INDEX idx_tasks_created_by   (created_by),
    INDEX idx_tasks_project_status (project_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Tasks — individual work items within a project';


-- ============================================================
-- 7. TASK ASSIGNMENTS
-- ============================================================
-- Junction table assigning users to tasks.
-- A task may have multiple assignees; a user may have many tasks.
-- ------------------------------------------------------------
CREATE TABLE task_assignments (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    task_id         INT UNSIGNED    NOT NULL,
    user_id         INT UNSIGNED    NOT NULL,
    assigned_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    PRIMARY KEY (id),
    CONSTRAINT uq_task_assignment UNIQUE (task_id, user_id),
    CONSTRAINT fk_ta_task        FOREIGN KEY (task_id)
        REFERENCES tasks (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_ta_user        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    -- Indexes
    INDEX idx_ta_task            (task_id),
    INDEX idx_ta_user            (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Many-to-many assignment of users to tasks';


-- ============================================================
-- 8. COMMENTS
-- ============================================================
-- Threaded discussion on tasks. Each comment is authored by
-- a user and attached to exactly one task.
-- ------------------------------------------------------------
CREATE TABLE comments (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    task_id         INT UNSIGNED    NOT NULL,
    user_id         INT UNSIGNED    NOT NULL,
    comment_text    TEXT            NOT NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    PRIMARY KEY (id),
    CONSTRAINT fk_comments_task  FOREIGN KEY (task_id)
        REFERENCES tasks (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_comments_user  FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    -- Indexes
    INDEX idx_comments_task      (task_id),
    INDEX idx_comments_user      (user_id),
    INDEX idx_comments_created   (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='User comments on tasks';


-- ============================================================
-- 9. ATTACHMENTS
-- ============================================================
-- File attachments linked to tasks. The actual file is stored
-- in cloud object storage; this table stores the metadata.
-- ------------------------------------------------------------
CREATE TABLE attachments (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    task_id         INT UNSIGNED    NOT NULL,
    uploaded_by     INT UNSIGNED    NOT NULL,
    file_name       VARCHAR(255)    NOT NULL,
    file_url        VARCHAR(500)    NOT NULL,
    uploaded_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    PRIMARY KEY (id),
    CONSTRAINT fk_attach_task    FOREIGN KEY (task_id)
        REFERENCES tasks (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_attach_user    FOREIGN KEY (uploaded_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    -- Indexes
    INDEX idx_attach_task        (task_id),
    INDEX idx_attach_user        (uploaded_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='File attachment metadata for tasks';


-- ============================================================
-- 10. NOTIFICATIONS
-- ============================================================
-- In-app notifications delivered via Socket.io and persisted
-- here for offline retrieval and read-status tracking.
-- ------------------------------------------------------------
CREATE TABLE notifications (
    id              INT UNSIGNED        NOT NULL AUTO_INCREMENT,
    user_id         INT UNSIGNED        NOT NULL,
    title           VARCHAR(200)        NOT NULL,
    message         TEXT                NOT NULL,
    type            ENUM('Assignment', 'Status Change', 'Comment', 'Deadline', 'System')
                                        NOT NULL,
    is_read         BOOLEAN             NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    PRIMARY KEY (id),
    CONSTRAINT fk_notif_user     FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    -- Indexes
    INDEX idx_notif_user         (user_id),
    INDEX idx_notif_is_read      (is_read),
    INDEX idx_notif_type         (type),
    INDEX idx_notif_user_unread  (user_id, is_read),
    INDEX idx_notif_created      (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='In-app notifications for real-time and offline delivery';
