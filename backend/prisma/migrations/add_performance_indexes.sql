-- Performance optimization indexes for ChannelDrop
-- These indexes will significantly improve query performance for file operations

-- Index for file listing queries (channel_id + active status + created_at)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_channel_active_created_at 
ON files(channel_id, is_active, created_at DESC);

-- Full-text search index for filename searches
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_search_text 
ON files USING gin(to_tsvector('english', filename || ' ' || original_name));

-- Index for user-channel lookups (most frequently accessed)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_channels_user_id 
ON user_channels(user_id);

-- Composite index for user-channel assignment queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_channels_user_channel 
ON user_channels(user_id, channel_id);

-- Index for file uploader lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_uploaded_by_created_at 
ON files(uploaded_by, created_at DESC);

-- Index for guest upload link lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_guest_links_token_active 
ON guest_upload_links(token) WHERE is_active = true;

-- Index for guest upload files
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_guest_upload 
ON files(guest_upload_link_id) WHERE guest_upload_link_id IS NOT NULL;

-- Partial index for active channels only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_channels_active_slug 
ON channels(slug) WHERE is_active = true;
