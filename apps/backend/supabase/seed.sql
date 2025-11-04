-- Seed data for development and testing

-- Insert sample users (for development only)
INSERT INTO users (id, wallet_address, username, email, avatar_url, is_active, preferences) VALUES
('550e8400-e29b-41d4-a716-446655440001', '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', 'alice_solana', 'alice@example.com', 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice', true, '{"theme": "dark", "notifications": true, "sound_effects": true, "auto_stake": true, "default_stake_amount": 25}'),
('550e8400-e29b-41d4-a716-446655440002', '5oNsLh32c6QUg7jRQ5f9cQqgqNkXH3x9qJQ3zL6k2aZt', 'bob_sol', 'bob@example.com', 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob', true, '{"theme": "light", "notifications": false, "sound_effects": true, "auto_stake": false, "default_stake_amount": 10}'),
('550e8400-e29b-41d4-a716-446655440003', '8KJEx4pLhM6vGzH9n3xQqR2sYc5vB7wF2j9kL3m6oP9a', 'charlie_crypto', null, 'https://api.dicebear.com/7.x/avataaars/svg?seed=charlie', true, '{"theme": "auto", "notifications": true, "sound_effects": false, "auto_stake": true, "default_stake_amount": 50}'),
('550e8400-e29b-41d4-a716-446655440004', '2xF7hP6qL9mR3jG8n5wQzXy8cK1vB4wF9a3kL6m2oP8s', 'diana_defi', 'diana@example.com', 'https://api.dicebear.com/7.x/avataaars/svg?seed=diana', true, '{"theme": "dark", "notifications": true, "sound_effects": true, "auto_stake": false, "default_stake_amount": 15}')
ON CONFLICT (id) DO NOTHING;

-- Insert sample games (for development only)
INSERT INTO games (user_id, wallet_address, stake_amount, status, result, score, moves_count, time_elapsed, started_at, completed_at, game_data, transaction_signature, rewards_claimed) VALUES
-- Alice's games
('550e8400-e29b-41d4-a716-446655440001', '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', 25.00, 'completed', 'win', 850, 45, 180, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '3 minutes', '{"moves": 45, "current_time": 180}', 'abc123def456', true),
('550e8400-e29b-41d4-a716-446655440001', '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', 25.00, 'completed', 'lose', 0, 23, 95, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '2 minutes', '{"moves": 23, "current_time": 95}', 'def456ghi789', true),
('550e8400-e29b-41d4-a716-446655440001', '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', 50.00, 'active', null, null, 12, 45, NOW() - INTERVAL '6 hours', null, '{"moves": 12, "current_time": 45}', 'ghi789jkl012', false),

-- Bob's games
('550e8400-e29b-41d4-a716-446655440002', '5oNsLh32c6QUg7jRQ5f9cQqgqNkXH3x9qJQ3zL6k2aZt', 10.00, 'completed', 'win', 920, 38, 165, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '3 minutes', '{"moves": 38, "current_time": 165}', 'jkl012mno345', true),
('550e8400-e29b-41d4-a716-446655440002', '5oNsLh32c6QUg7jRQ5f9cQqgqNkXH3x9qJQ3zL6k2aZt', 10.00, 'completed', 'win', 780, 52, 210, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '4 minutes', '{"moves": 52, "current_time": 210}', 'mno345pqr678', true),
('550e8400-e29b-41d4-a716-446655440002', '5oNsLh32c6QUg7jRQ5f9cQqgqNkXH3x9qJQ3zL6k2aZt', 15.00, 'completed', 'lose', 0, 67, 280, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '5 minutes', '{"moves": 67, "current_time": 280}', 'pqr678stu901', true),

-- Charlie's games
('550e8400-e29b-41d4-a716-446655440003', '8KJEx4pLhM6vGzH9n3xQqR2sYc5vB7wF2j9kL3m6oP9a', 50.00, 'completed', 'win', 1100, 28, 125, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days' + INTERVAL '2 minutes', '{"moves": 28, "current_time": 125}', 'stu901vwx234', true),
('550e8400-e29b-41d4-a716-446655440003', '8KJEx4pLhM6vGzH9n3xQqR2sYc5vB7wF2j9kL3m6oP9a', 100.00, 'abandoned', null, null, 0, 0, 0, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '1 day', '{"moves": 0, "current_time": 0}', 'vwx234yz567', false),

-- Diana's games
('550e8400-e29b-41d4-a716-446655440004', '2xF7hP6qL9mR3jG8n5wQzXy8cK1vB4wF9a3kL6m2oP8s', 15.00, 'completed', 'win', 890, 41, 175, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '3 minutes', '{"moves": 41, "current_time": 175}', 'yz567abc890', true),
('550e8400-e29b-41d4-a716-446655440004', '2xF7hP6qL9mR3jG8n5wQzXy8cK1vB4wF9a3kL6m2oP8s', 15.00, 'completed', 'lose', 0, 89, 340, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days' + INTERVAL '6 minutes', '{"moves": 89, "current_time": 340}', 'abc890def123', true)
ON CONFLICT DO NOTHING;

-- Insert sample transactions (for development only)
INSERT INTO transactions (user_id, wallet_address, type, amount, token_type, transaction_signature, status, created_at, confirmed_at, game_id, block_height, slot) VALUES
-- Alice's transactions
('550e8400-e29b-41d4-a716-446655440001', '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', 'stake', 25.00, 'GAME', 'tx_stake_alice_1', 'confirmed', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '10 seconds', (SELECT id FROM games WHERE transaction_signature = 'abc123def456'), 123456789, 987654321),
('550e8400-e29b-41d4-a716-446655440001', '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', 'reward', 50.00, 'GAME', 'tx_reward_alice_1', 'confirmed', NOW() - INTERVAL '2 days' + INTERVAL '3 minutes', NOW() - INTERVAL '2 days' + INTERVAL '3 minutes' + INTERVAL '5 seconds', (SELECT id FROM games WHERE transaction_signature = 'abc123def456'), 123456790, 987654322),
('550e8400-e29b-41d4-a716-446655440001', '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', 'stake', 25.00, 'GAME', 'tx_stake_alice_2', 'confirmed', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '8 seconds', (SELECT id FROM games WHERE transaction_signature = 'def456ghi789'), 123456791, 987654323),
('550e8400-e29b-41d4-a716-446655440001', '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', 'stake', 50.00, 'GAME', 'tx_stake_alice_3', 'confirmed', NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours' + INTERVAL '12 seconds', (SELECT id FROM games WHERE transaction_signature = 'ghi789jkl012'), 123456792, 987654324),

-- Bob's transactions
('550e8400-e29b-41d4-a716-446655440002', '5oNsLh32c6QUg7jRQ5f9cQqgqNkXH3x9qJQ3zL6k2aZt', 'stake', 10.00, 'GAME', 'tx_stake_bob_1', 'confirmed', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '15 seconds', (SELECT id FROM games WHERE transaction_signature = 'jkl012mno345'), 123456793, 987654325),
('550e8400-e29b-41d4-a716-446655440002', '5oNsLh32c6QUg7jRQ5f9cQqgqNkXH3x9qJQ3zL6k2aZt', 'reward', 20.00, 'GAME', 'tx_reward_bob_1', 'confirmed', NOW() - INTERVAL '3 days' + INTERVAL '3 minutes', NOW() - INTERVAL '3 days' + INTERVAL '3 minutes' + INTERVAL '8 seconds', (SELECT id FROM games WHERE transaction_signature = 'jkl012mno345'), 123456794, 987654326),
('550e8400-e29b-41d4-a716-446655440002', '5oNsLh32c6QUg7jRQ5f9cQqgqNkXH3x9qJQ3zL6k2aZt', 'stake', 10.00, 'GAME', 'tx_stake_bob_2', 'confirmed', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '11 seconds', (SELECT id FROM games WHERE transaction_signature = 'mno345pqr678'), 123456795, 987654327),
('550e8400-e29b-41d4-a716-446655440002', '5oNsLh32c6QUg7jRQ5f9cQqgqNkXH3x9qJQ3zL6k2aZt', 'reward', 20.00, 'GAME', 'tx_reward_bob_2', 'confirmed', NOW() - INTERVAL '2 days' + INTERVAL '4 minutes', NOW() - INTERVAL '2 days' + INTERVAL '4 minutes' + INTERVAL '7 seconds', (SELECT id FROM games WHERE transaction_signature = 'mno345pqr678'), 123456796, 987654328),

-- Charlie's transactions
('550e8400-e29b-41d4-a716-446655440003', '8KJEx4pLhM6vGzH9n3xQqR2sYc5vB7wF2j9kL3m6oP9a', 'stake', 50.00, 'GAME', 'tx_stake_charlie_1', 'confirmed', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days' + INTERVAL '20 seconds', (SELECT id FROM games WHERE transaction_signature = 'stu901vwx234'), 123456797, 987654329),
('550e8400-e29b-41d4-a716-446655440003', '8KJEx4pLhM6vGzH9n3xQqR2sYc5vB7wF2j9kL3m6oP9a', 'reward', 100.00, 'GAME', 'tx_reward_charlie_1', 'confirmed', NOW() - INTERVAL '4 days' + INTERVAL '2 minutes', NOW() - INTERVAL '4 days' + INTERVAL '2 minutes' + INTERVAL '12 seconds', (SELECT id FROM games WHERE transaction_signature = 'stu901vwx234'), 123456798, 987654330),
('550e8400-e29b-41d4-a716-446655440003', '8KJEx4pLhM6vGzH9n3xQqR2sYc5vB7wF2j9kL3m6oP9a', 'stake', 100.00, 'GAME', 'tx_stake_charlie_2', 'confirmed', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '25 seconds', (SELECT id FROM games WHERE transaction_signature = 'vwx234yz567'), 123456799, 987654331),

-- Diana's transactions
('550e8400-e29b-41d4-a716-446655440004', '2xF7hP6qL9mR3jG8n5wQzXy8cK1vB4wF9a3kL6m2oP8s', 'stake', 15.00, 'GAME', 'tx_stake_diana_1', 'confirmed', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '18 seconds', (SELECT id FROM games WHERE transaction_signature = 'yz567abc890'), 123456800, 987654332),
('550e8400-e29b-41d4-a716-446655440004', '2xF7hP6qL9mR3jG8n5wQzXy8cK1vB4wF9a3kL6m2oP8s', 'reward', 30.00, 'GAME', 'tx_reward_diana_1', 'confirmed', NOW() - INTERVAL '5 days' + INTERVAL '3 minutes', NOW() - INTERVAL '5 days' + INTERVAL '3 minutes' + INTERVAL '10 seconds', (SELECT id FROM games WHERE transaction_signature = 'yz567abc890'), 123456801, 987654333),
('550e8400-e29b-41d4-a716-446655440004', '2xF7hP6qL9mR3jG8n5wQzXy8cK1vB4wF9a3kL6m2oP8s', 'stake', 15.00, 'GAME', 'tx_stake_diana_2', 'confirmed', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days' + INTERVAL '22 seconds', (SELECT id FROM games WHERE transaction_signature = 'abc890def123'), 123456802, 987654334)
ON CONFLICT (transaction_signature) DO NOTHING;