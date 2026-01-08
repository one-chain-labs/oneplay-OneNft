#!/usr/bin/env ts-node

import { SuiClient } from '@onelabs/sui/client';
import { Ed25519Keypair } from '@onelabs/sui/keypairs/ed25519';
import { Transaction} from '@onelabs/sui/transactions';
import { fromB64 } from '@onelabs/sui/utils';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// Configuration
const TESTNET_URL = 'https://rpc-testnet.onelabs.cc:443';

class AnimeMerchandiseCLI {
    private client: SuiClient;
    private keypair: Ed25519Keypair | null = null;
    private packageId: string | null = null;
    private marketplaceId: string | null = null;
    private marketplaceCapId: string | null = null;

    constructor() {
        this.client = new SuiClient({ url: TESTNET_URL });
    }

    async initialize() {
        console.log('🎌 Welcome to Anime Merchandise Tokenization Platform CLI!\n');

        // Load deployment info
        await this.loadDeploymentInfo();

        // Load keypair
        await this.loadKeypair();

        console.log('✅ CLI initialized successfully!\n');
    }

    private async loadDeploymentInfo() {
        try {
            const deploymentPath = path.join(__dirname, '../../deployment-info.json');
            if (fs.existsSync(deploymentPath)) {
                const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
                this.packageId = deployment.packageId;
                console.log(`📦 Package ID: ${this.packageId}`);
            } else {
                console.log('⚠️  No deployment info found. Please deploy first.');
            }
        } catch (error) {
            console.log('⚠️  Could not load deployment info.');
        }
    }

    private async loadKeypair() {
        try {
            const keyfilePath = path.join(__dirname, '../../.sui/sui_config/sui.keystore');
            if (fs.existsSync(keyfilePath)) {
                const keystore = JSON.parse(fs.readFileSync(keyfilePath, 'utf8'));
                const privateKey = fromB64(keystore[0]);
                this.keypair = Ed25519Keypair.fromSecretKey(privateKey);
                console.log(`👤 Address: ${this.keypair.getPublicKey().toSuiAddress()}`);
            } else {
                console.log('⚠️  No keyfile found. Please run deployment first.');
            }
        } catch (error) {
            console.log('⚠️  Could not load keypair.');
        }
    }

    async showMenu() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        while (true) {
            console.log('\n📋 Available Commands:');
            console.log('1. Create merchandise item');
            console.log('2. Mint NFT');
            console.log('3. List marketplace items');
            console.log('4. View NFT details');
            console.log('5. Check balance');
            console.log('6. Exit');

            const choice = await this.question(rl, '\nEnter your choice (1-6): ');

            switch (choice) {
                case '1':
                    await this.createMerchandiseItem(rl);
                    break;
                case '2':
                    await this.mintNFT(rl);
                    break;
                case '3':
                    await this.listMarketplaceItems();
                    break;
                case '4':
                    await this.viewNFTDetails(rl);
                    break;
                case '5':
                    await this.checkBalance();
                    break;
                case '6':
                    console.log('👋 Goodbye!');
                    rl.close();
                    return;
                default:
                    console.log('❌ Invalid choice. Please try again.');
            }
        }
    }

    private async createMerchandiseItem(rl: readline.Interface) {
        if (!this.keypair || !this.packageId) {
            console.log('❌ CLI not properly initialized. Please check deployment and keypair.');
            return;
        }

        console.log('\n📝 Creating new merchandise item...');

        try {
            const name = await this.question(rl, 'Enter item name: ');
            const description = await this.question(rl, 'Enter description: ');
            const imageUrl = await this.question(rl, 'Enter image URL: ');
            const rarity = parseInt(await this.question(rl, 'Enter rarity (1-5): '));
            const royalty = parseInt(await this.question(rl, 'Enter royalty percentage (0-10): '));
            const supply = parseInt(await this.question(rl, 'Enter total supply: '));
            const price = parseInt(await this.question(rl, 'Enter price in OCT: '));
            const category = await this.question(rl, 'Enter category (figurine/poster/apparel): ');
            const series = await this.question(rl, 'Enter anime series: ');

            const tx = new Transaction();

            // Note: This is a simplified version - you'll need the actual marketplace objects
            console.log('⚠️  Note: This requires marketplace objects from deployment');
            console.log('✅ Item creation transaction prepared (not executed)');

        } catch (error) {
            console.error('❌ Error creating item:', error);
        }
    }

    private async mintNFT(rl: readline.Interface) {
        if (!this.keypair || !this.packageId) {
            console.log('❌ CLI not properly initialized.');
            return;
        }

        console.log('\n🎨 Minting NFT...');
        console.log('⚠️  This feature requires marketplace objects from deployment');
    }

    private async listMarketplaceItems() {
        console.log('\n📊 Marketplace Items:');
        console.log('⚠️  This feature requires marketplace objects from deployment');
    }

    private async viewNFTDetails(rl: readline.Interface) {
        console.log('\n🔍 View NFT Details:');
        console.log('⚠️  This feature requires marketplace objects from deployment');
    }

    private async checkBalance() {
        if (!this.keypair) {
            console.log('❌ No keypair loaded.');
            return;
        }

        try {
            const address = this.keypair.getPublicKey().toSuiAddress();
            const balance = await this.client.getBalance({
                owner: address,
                coinType: '0x2::sui::SUI'
            });

            console.log(`\n💰 Balance for ${address}:`);
            console.log(`Total: ${balance.totalBalance} SUI`);
            // console.log(`Coins: ${balance.coinObjects.length} coin objects`);
        } catch (error) {
            console.error('❌ Error checking balance:', error);
        }
    }

    private question(rl: readline.Interface, query: string): Promise<string> {
        return new Promise((resolve) => {
            rl.question(query, resolve);
        });
    }
}

// Main execution
async function main() {
    const cli = new AnimeMerchandiseCLI();

    try {
        await cli.initialize();
        await cli.showMenu();
    } catch (error) {
        console.error('💥 CLI error:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
