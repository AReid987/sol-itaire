# 🦊 Phantom Wallet Setup Guide

## 🎯 Your Project Wallet Address
**DvMuEKdXMaNfhm157hq36FNLKD1jRe6LrWV183b1Y7L1**

## 🔧 Configuration Steps

### 1. **Connect Your Phantom Wallet to the Project**

Your Phantom wallet is already configured for the tokens we deployed:

#### **Token Addresses**
- **Gaming Token (SOL-IT)**: `2M4qUmbTiSRtRmfRcnZFWQyNXqkeQ4c9TzCdC7d6svPD`
- **Memecoin (SOL-COIN)**: `6ygxtUVufLvihkSm4xv3Ny42ocRmwbMHaJ23kiovFKiH`

### 2. **Import Tokens to Phantom**

1. **Open Phantom Wallet**
2. **Go to "Assets" tab**
3. **Click "Add Token"**
4. **Enter Gaming Token Address**:
   - Address: `2M4qUmbTiSRtRmfRcnZFWQyNXqkeQ4c9TzCdC7d6svPD`
   - Name: `Solitaire Gaming Token`
   - Symbol: `SOL-IT`
   - Decimals: `9`

5. **Add Memecoin**:
   - Address: `6ygxtUVufLvihkSm4xv3Ny42ocRmwbMHaJ23kiovFKiH`
   - Name: `Solitaire Memecoin`
   - Symbol: `SOL-COIN`
   - Decimals: `9`

### 3. **Switch to Devnet (for Testing)**

1. **Click the network selector** (top left corner)
2. **Select "Devnet"**
3. **Confirm the switch**

### 4. **Transfer Tokens from Deployer Wallet**

The tokens are currently in the CLI wallet. To transfer them to your Phantom wallet:

#### **Option A: Use Solana CLI**
```bash
# Set your Phantom wallet as recipient
RECIPIENT="DvMuEKdXMaNfhm157hq36FNLKD1jRe6LrWV183b1Y7L1"

# Transfer Gaming Tokens
spl-token transfer 2M4qUmbTiSRtRmfRcnZFWQyNXqkeQ4c9TzCdC7d6svPD 1000000000000 $RECIPIENT

# Transfer Memecoins
spl-token transfer 6ygxtUVufLvihkSm4xv3Ny42ocRmwbMHaJ23kiovFKiH 1000000000000 $RECIPIENT
```

#### **Option B: Use Phantom Web Interface**
1. **Open your deployed Sol-itaire app**
2. **Connect your Phantom wallet**
3. **Request tokens from the CLI wallet** (feature to be implemented)

### 5. **Verify Token Balances**

After transfer, check your Phantom wallet:
- **SOL-IT balance**: Should show transferred amount
- **SOL-COIN balance**: Should show transferred amount
- **SOL balance**: Keep some for transaction fees

## 🔐 Security Best Practices

### **Wallet Security**
- ✅ **Never share your private key**
- ✅ **Use hardware wallet for mainnet**
- ✅ **Keep seed phrase offline and secure**
- ✅ **Enable Phantom's security features**

### **Token Security**
- ✅ **Verify token addresses before adding**
- ✅ **Double-check transaction details**
- ✅ **Start with small test amounts**
- ✅ **Keep transaction signatures for records**

## 🚀 Next Steps

### **For Development**
1. **Test token transfers** between wallets
2. **Verify game integration** with tokens
3. **Test staking functionality**
4. **Validate reward distribution**

### **For Production**
1. **Deploy to mainnet** after thorough testing
2. **Set up liquidity pools** on DEX
3. **Create token listings** on CoinGecko/CMC
4. **Launch marketing campaign**

## 📱 Mobile Access

### **Phantom Mobile App**
1. **Download Phantom** from App Store/Play Store
2. **Import wallet** using seed phrase (carefully!)
3. **Access Sol-itaire** via mobile browser
4. **Play on-the-go** with same wallet

## 🔧 Troubleshooting

### **Common Issues**

#### **Tokens Not Showing**
- **Solution**: Manually add token addresses
- **Check**: Network is set to Devnet
- **Verify**: Correct token decimals (9)

#### **Transaction Failures**
- **Check**: SOL balance for fees
- **Verify**: Recipient address is correct
- **Network**: Ensure you're on Devnet

#### **Connection Issues**
- **Refresh**: Reload the page
- **Clear**: Browser cache and cookies
- **Update**: Phantom to latest version

## 📞 Support

If you encounter issues:
1. **Check this guide first**
2. **Review transaction history**
3. **Join our Discord community**
4. **Create a GitHub issue**

---

**Your Phantom wallet is now ready for Sol-itaire!** 🎮🦊

**Ready to play and earn?** 💰