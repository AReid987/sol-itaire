-- Create useful functions and views for analytics

-- Function to get user statistics
CREATE OR REPLACE FUNCTION get_user_stats(user_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    user_stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_games', COUNT(*),
        'total_wins', COUNT(*) FILTER (WHERE result = 'win'),
        'total_losses', COUNT(*) FILTER (WHERE result = 'lose'),
        'win_rate', CASE
            WHEN COUNT(*) FILTER (WHERE result IN ('win', 'lose')) > 0
            THEN ROUND((COUNT(*) FILTER (WHERE result = 'win')::decimal / COUNT(*) FILTER (WHERE result IN ('win', 'lose')) * 100), 2)
            ELSE 0
        END,
        'total_staked', COALESCE(SUM(t.amount), 0) FILTER (WHERE t.type = 'stake' AND t.status = 'confirmed'),
        'total_earned', COALESCE(SUM(t.amount), 0) FILTER (WHERE t.type = 'reward' AND t.status = 'confirmed'),
        'best_score', MAX(score),
        'average_score', ROUND(AVG(score), 2),
        'last_played', MAX(started_at)
    ) INTO user_stats
    FROM games g
    LEFT JOIN transactions t ON g.id = t.game_id AND t.status = 'confirmed'
    WHERE g.user_id = user_uuid AND g.status IN ('completed', 'abandoned');

    RETURN user_stats;
END;
$$ LANGUAGE plpgsql;

-- Function to get leaderboard data
CREATE OR REPLACE FUNCTION get_leaderboard(period_param TEXT DEFAULT 'all_time', limit_param INTEGER DEFAULT 50, offset_param INTEGER DEFAULT 0)
RETURNS TABLE (
    rank INTEGER,
    user_id UUID,
    username TEXT,
    wallet_address TEXT,
    total_wins BIGINT,
    total_games BIGINT,
    win_rate DECIMAL,
    total_earned DECIMAL,
    avatar_url TEXT,
    last_active TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    WITH user_game_stats AS (
        SELECT
            u.id,
            u.username,
            u.wallet_address,
            u.avatar_url,
            u.last_login,
            COUNT(g.id) as total_games,
            COUNT(g.id) FILTER (WHERE g.result = 'win') as total_wins,
            COALESCE(SUM(t.amount), 0) FILTER (WHERE t.type = 'reward' AND t.status = 'confirmed') as total_earned
        FROM users u
        LEFT JOIN games g ON u.id = g.user_id
            AND g.status = 'completed'
            AND CASE
                WHEN period_param = 'daily' THEN g.started_at >= CURRENT_DATE
                WHEN period_param = 'weekly' THEN g.started_at >= CURRENT_DATE - INTERVAL '7 days'
                WHEN period_param = 'monthly' THEN g.started_at >= DATE_TRUNC('month', CURRENT_DATE)
                ELSE TRUE
            END
        LEFT JOIN transactions t ON u.id = t.user_id
            AND t.type = 'reward'
            AND t.status = 'confirmed'
            AND CASE
                WHEN period_param = 'daily' THEN t.created_at >= CURRENT_DATE
                WHEN period_param = 'weekly' THEN t.created_at >= CURRENT_DATE - INTERVAL '7 days'
                WHEN period_param = 'monthly' THEN t.created_at >= DATE_TRUNC('month', CURRENT_DATE)
                ELSE TRUE
            END
        WHERE u.is_active = true
        GROUP BY u.id, u.username, u.wallet_address, u.avatar_url, u.last_login
        HAVING COUNT(g.id) > 0
    ),
    ranked_users AS (
        SELECT *,
            CASE
                WHEN total_games > 0 THEN ROUND((total_wins::decimal / total_games) * 100, 2)
                ELSE 0
            END as win_rate,
            ROW_NUMBER() OVER (ORDER BY total_wins DESC, total_games DESC) as rank
        FROM user_game_stats
    )
    SELECT
        rank,
        id::uuid as user_id,
        username,
        wallet_address,
        total_wins::bigint,
        total_games::bigint,
        win_rate,
        total_earned,
        avatar_url,
        last_login as last_active
    FROM ranked_users
    ORDER BY rank
    LIMIT limit_param
    OFFSET offset_param;
END;
$$ LANGUAGE plpgsql;

-- View for game analytics
CREATE OR REPLACE VIEW game_analytics AS
SELECT
    DATE_TRUNC('day', started_at) as date,
    COUNT(*) as total_games,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_games,
    COUNT(*) FILTER (WHERE result = 'win') as wins,
    COUNT(*) FILTER (WHERE result = 'lose') as losses,
    ROUND(AVG(score), 2) as average_score,
    MAX(score) as highest_score,
    ROUND(AVG(time_elapsed), 2) as average_time,
    MIN(time_elapsed) as fastest_time,
    COUNT(DISTINCT user_id) as unique_players,
    COALESCE(SUM(stake_amount), 0) as total_volume
FROM games
WHERE started_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', started_at)
ORDER BY date DESC;

-- View for transaction analytics
CREATE OR REPLACE VIEW transaction_analytics AS
SELECT
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as total_transactions,
    COUNT(*) FILTER (WHERE type = 'stake') as staking_transactions,
    COUNT(*) FILTER (WHERE type = 'reward') as reward_transactions,
    COALESCE(SUM(amount), 0) FILTER (WHERE type = 'stake') as staking_volume,
    COALESCE(SUM(amount), 0) FILTER (WHERE type = 'reward') as rewards_paid,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_transactions,
    COUNT(DISTINCT user_id) as unique_users
FROM transactions
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- Function for health check
CREATE OR REPLACE FUNCTION health_check()
RETURNS JSONB AS $$
BEGIN
    RETURN jsonb_build_object(
        'status', 'healthy',
        'timestamp', NOW(),
        'database', 'connected'
    );
END;
$$ LANGUAGE plpgsql;

-- Trigger to update user last_login when they create a game or transaction
CREATE OR REPLACE FUNCTION update_user_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users
    SET last_login = NOW()
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_activity_games
    AFTER INSERT ON games
    FOR EACH ROW
    EXECUTE FUNCTION update_user_activity();

CREATE TRIGGER update_user_activity_transactions
    AFTER INSERT ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_activity();

-- Comments
COMMENT ON FUNCTION get_user_stats IS 'Get comprehensive statistics for a user';
COMMENT ON FUNCTION get_leaderboard IS 'Get leaderboard data with filtering options';
COMMENT ON VIEW game_analytics IS 'Daily game analytics for the last 30 days';
COMMENT ON VIEW transaction_analytics IS 'Daily transaction analytics for the last 30 days';
COMMENT ON FUNCTION health_check IS 'Simple health check function for monitoring';