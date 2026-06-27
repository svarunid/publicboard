CREATE TABLE `posts` (
	`id` text PRIMARY KEY,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`board` text NOT NULL,
	`evidence` text NOT NULL,
	`evidence_type` text NOT NULL,
	`country` text NOT NULL,
	`state` text,
	`district` text,
	`timestamp` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
