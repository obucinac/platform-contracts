/*
    Test integration of the platform contracts.

    Copyright (C) 2018 EthicHub

    This file is part of platform contracts.

    This is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
    */
'use strict';
import ether from './helpers/ether';
import {advanceBlock} from './helpers/advanceToBlock';
import {increaseTimeTo, duration} from './helpers/increaseTime';
import latestTime from './helpers/latestTime';
import EVMRevert from './helpers/EVMRevert';

const EthereumTx = require('ethereumjs-tx');
const BigNumber = web3.BigNumber
const should = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should()
const web3_1_0 = require('web3');
const utils = web3_1_0.utils;
const fs = require('fs');
const storage = artifacts.require('./storage/EthicHubStorage.sol');
const userManager = artifacts.require('./user/EthicHubUser.sol');
const lending = artifacts.require('./lending/EthicHubLending.sol');
const reputation = artifacts.require('./reputation/EthicHubReputation.sol');

// Default key pairs made by testrpc when using `truffle develop` CLI tool
// NEVER USE THESE KEYS OUTSIDE OF THE LOCAL TEST ENVIRONMENT
const publicKeys = [
    '0x627306090abab3a6e1400e9345bc60c78a8bef57',
    '0xf17f52151ebef6c7334fad080c5704d77216b732',
    '0xc5fdf4076b8f3a5357c5e395ab970b5b54098fef',
    '0x821aea9a577a9b44299b9c15c88cf3087f3b5544',
    '0x0d1d4e623d10f9fba5db95830f7d3839406c6af2',
    '0x2932b7a2355d6fecc4b5c0b6bd44cc31df247a2e',
    '0x2191ef87e392377ec08e7c08eb105ef5448eced5',
    '0x0f4f2ac550a1b4e2280d04c21cea7ebd822934b5',
    '0x6330a553fc93768f612722bb8c2ec78ac90b3bbc',
    '0x5aeda56215b167893e80b4fe645ba6d5bab767de'
]

const privateKeys = [
    'c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3',
    'ae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f',
    '0dbbe8e4ae425a6d2687f1a7e3ba17bc98c673636790f1b8ad91193c05875ef1',
    'c88b703fb08cbea894b6aeff5a544fb92e78a18e19814cd85da83b71f772aa6c',
    '388c684f0ba1ef5017716adb5d21a053ea8e90277d0868337519f97bede61418',
    '659cbb0e2411a44db63778987b1e22153c086a95eb6b18bdf89de078917abc63',
    '82d052c865f5763aad42add438569276c00d3d88a2d062d36b2bae914d58b8c8',
    'aa3680d5d48a8283413f7a108367c7299ca73f553735860a87b08f39395618b7',
    '0f62d96d6675f32685bbdb8ac13cda7c23436f63efbb9d07700d8669ff12b7c4',
    '8d5366123cb560bb606379f90a0bfd4769eecc0557f1b362dcae9012b548b1e5'
];

function now() {
    return Math.round((new Date()).getTime() / 1000);
}

async function deployedContracts (debug = false) {

    const instances = Promise.all([
        storage.deployed(),
        userManager.deployed(),
        reputation.deployed(),
        lending.deployed()
    ]);
    return instances;

}
const ownerTruffle = web3.eth.accounts[0];
const localNode2 = web3.eth.accounts[1];
const community = web3.eth.accounts[2];
const localNode1 = web3.eth.accounts[3];
const teamEH = web3.eth.accounts[4];
const investor1 = web3.eth.accounts[5];
const investor2 = web3.eth.accounts[6];
const investor3 = web3.eth.accounts[7];

contract('EthicHubUser', function() {
    let instances;
    let storageInstance;
    let reputationInstance;
    let userManagerInstance;
    let lendingInstance;
    let ownerUserManager;
    let ownerLending;

    before(async () => {
        await advanceBlock();
        instances = await deployedContracts();
        storageInstance = instances[0];
        userManagerInstance = instances[1];
        reputationInstance = instances[2];
        lendingInstance = instances[3];
        ownerUserManager = await userManagerInstance.owner();
        ownerLending = await lendingInstance.owner();
    });
    it('should pass if contract are on storage contract', async function() {
        console.log("--------------> "+1);
        let userManagerContractAddress = await storageInstance.getAddress(utils.soliditySha3("contract.name", "users"));
        userManagerContractAddress.should.be.equal(userManagerInstance.address);
    });
    it('should register local node', async function() {
        console.log("--------------> "+2);
        await userManagerInstance.registerLocalNode(localNode1);
        let registrationStatus = await userManagerInstance.viewRegistrationStatus(localNode1, 'localNode');
        registrationStatus.should.be.equal(true);
        let localNodeReputation = await reputationInstance.getLocalNodeReputation(localNode1).should.be.fulfilled;
        localNodeReputation.should.be.bignumber.equal(500);
    });
    it('should register community', async function() {
        console.log("--------------> "+3);
        await userManagerInstance.registerCommunity(community);
        let registrationStatus = await userManagerInstance.viewRegistrationStatus(community, 'community');
        registrationStatus.should.be.equal(true);
        let communityReputation = await reputationInstance.getCommunityReputation(community).should.be.fulfilled;
        communityReputation.should.be.bignumber.equal(500);
    });
    it('should register investor', async function() {
        console.log("--------------> "+4);

        await userManagerInstance.registerInvestor(investor1);
        let registrationStatus = await userManagerInstance.viewRegistrationStatus(investor1, 'investor');
        registrationStatus.should.be.equal(true);
    });
    it('change user status', async function() {
        console.log("--------------> "+5)

        await userManagerInstance.changeUserStatus(investor1, 'investor', false);
        let registrationStatus = await userManagerInstance.viewRegistrationStatus(investor1, 'investor');
        registrationStatus.should.be.equal(false);
        await userManagerInstance.changeUserStatus(investor1, 'investor', true);
        registrationStatus = await userManagerInstance.viewRegistrationStatus(investor1, 'localNode');
        registrationStatus.should.be.equal(false);
        registrationStatus = await userManagerInstance.viewRegistrationStatus(investor1, 'investor');
        registrationStatus.should.be.equal(true);
    });
    it('change users status', async function() {
        console.log("--------------> "+6);

        await userManagerInstance.changeUsersStatus([localNode1, localNode2],  'localNode', false);
        let registrationStatus = await userManagerInstance.viewRegistrationStatus(localNode1, 'localNode');
        registrationStatus.should.be.equal(false);
        await userManagerInstance.changeUsersStatus([localNode1, localNode2], 'localNode', true);
        registrationStatus = await userManagerInstance.viewRegistrationStatus(localNode1, 'community');
        registrationStatus.should.be.equal(false);
        registrationStatus = await userManagerInstance.viewRegistrationStatus(localNode2, 'community');
        registrationStatus.should.be.equal(false);
        registrationStatus = await userManagerInstance.viewRegistrationStatus(localNode1, 'localNode');
        registrationStatus.should.be.equal(true);
        registrationStatus = await userManagerInstance.viewRegistrationStatus(localNode2, 'localNode');
        registrationStatus.should.be.equal(true);
    });
    it('should pass if contract are on storage contract', async function() {
        console.log("--------------> "+7);
        let lendingContractAddress = await storageInstance.getAddress(utils.soliditySha3("contract.address", lendingInstance.address));
        lendingContractAddress.should.be.equal(lendingInstance.address);
    });
    it('investment reaches goal', async function() {
        console.log("--------------> "+8);
        await increaseTimeTo(latestTime() + duration.days(1));
        // Some initial parameters
        const initialEthPerFiatRate = 100;
        const finalEthPerFiatRate = 100;
        const investment1 = ether(0.5);
        const investment2 = ether(0.5);
        const investment3 = ether(1.5);
        const defaultDays = 1;
        let transaction;
        let localNodeRep;
        let communityRep;
        let maxDefaultDays;
        let initialCommunityReputation;
        let initialLocalNodeReputation;

        // Show balances
        //console.log('=== INITIAL ===');
        //await traceBalancesAllActors();

        // Calculate reputation
        maxDefaultDays = await storageInstance.getUint(utils.soliditySha3("lending.maxDefaultDays", lendingInstance));
        console.log('Max Default Days: ' + maxDefaultDays);
        //Community rep
        initialCommunityReputation = await reputationInstance.getCommunityReputation(community).should.be.fulfilled;
        console.log('Initial Community Reputation: '+ initialCommunityReputation);
        var expectedRep = initialCommunityReputation.sub(initialCommunityReputation.mul(defaultDays).div(maxDefaultDays)).toNumber();
        expectedRep = Math.floor(expectedRep);
        //communityRep.should.be.bignumber.equal(expectedRep);
        console.log('Community Reputation: ' + communityRep);

        //Local Node rep
        localNodeRep = await reputationInstance.getLocalNodeReputation(localNode1).should.be.fulfilled;
        initialLocalNodeReputation = await storageInstance.getUint(utils.soliditySha3("localNode.reputation", localNode1));
        console.log('Initial Local Node Reputation: '+ initialLocalNodeReputation);
        var decrement = initialLocalNodeReputation.mul(defaultDays).div(maxDefaultDays);
        var expectedRep = initialLocalNodeReputation.sub(decrement).toNumber();
        expectedRep = Math.floor(expectedRep);
        //localNodeRep.should.be.bignumber.equal(expectedRep);
        console.log('Local Node Reputation: ' + localNodeRep);

        // Register the invetors
        transaction = await userManagerInstance.registerInvestor(investor1);
        reportMethodGasUsed('report', 'ownerUserManager', 'userManagerInstance.registerInvestor(investor1)', transaction.tx, true);
        transaction = await userManagerInstance.registerInvestor(investor2);
        reportMethodGasUsed('report', 'ownerUserManager', 'userManagerInstance.registerInvestor(investor2)', transaction.tx);
        transaction = await userManagerInstance.registerInvestor(investor3);
        reportMethodGasUsed('report', 'ownerUserManager', 'userManagerInstance.registerInvestor(investor3)', transaction.tx);

        // Is contribution period
        var isRunning = await lendingInstance.isContribPeriodRunning();
        isRunning.should.be.equal(true);

        // Investment part
        //Raw transaction in truffle develop. CAUTION the private key is from truffle
        //await rawTransaction(investor1, privateKeys[5], lendingInstance.address, '', investment1).should.be.fulfilled;
        //Send transaction
        transaction = await lendingInstance.sendTransaction({value: investment1, from: investor1}).should.be.fulfilled;
        reportMethodGasUsed('report', 'investor1', 'lendingInstance.sendTransaction', transaction.tx);
        const contribution1 = await lendingInstance.checkInvestorContribution(investor1);
        contribution1.should.be.bignumber.equal(investment1);
        transaction = await lendingInstance.sendTransaction({value: investment2, from: investor2}).should.be.fulfilled;
        reportMethodGasUsed('report', 'investor2', 'lendingInstance.sendTransaction', transaction.tx);
        const contribution2 = await lendingInstance.checkInvestorContribution(investor2);
        contribution2.should.be.bignumber.equal(investment2);
        // Goal is reached, no accepts more invesments
        await lendingInstance.sendTransaction({value: investment3, from: investor3}).should.be.rejectedWith(EVMRevert);
        //reportMethodGasUsed('report', 'investor3', 'lendingInstance.sendTransaction', transaction.tx);
        transaction = await lendingInstance.finishInitialExchangingPeriod(initialEthPerFiatRate, {from: ownerLending}).should.be.fulfilled;
        reportMethodGasUsed('report', 'ownerLending', 'lendingInstance.finishInitialExchangingPeriod', transaction.tx);

        // Borrower return amount
        transaction = await lendingInstance.setBorrowerReturnEthPerFiatRate(finalEthPerFiatRate, {from: ownerLending}).should.be.fulfilled;
        reportMethodGasUsed('report', 'ownerLending', 'lendingInstance.setBorrowerReturnEthPerFiatRate', transaction.tx);
        // Show balances
        //console.log('=== MIDDLE ===');
        //await traceBalancesAllActors();
        // Show amounts to return
        const borrowerReturnAmount = await lendingInstance.borrowerReturnAmount();
        //console.log('Community return amount (ETH):' + utils.fromWei(utils.toBN(borrowerReturnAmount)));
        //const borrowerReturnFiatAmount = await lendingInstance.borrowerReturnFiatAmount();
        //console.log('Community return amount (pesos):' + utils.fromWei(utils.toBN(borrowerReturnFiatAmount)));
        transaction = await lendingInstance.returnBorrowedEth({value: borrowerReturnAmount, from: community}).should.be.fulfilled;
        reportMethodGasUsed('report', 'community', 'lendingInstance.returnBorrowedEth', transaction.tx);
        // Reclaims amounts
        transaction = await lendingInstance.reclaimContributionWithInterest(investor1, {from: investor1}).should.be.fulfilled;
        reportMethodGasUsed('report', 'investor1', 'lendingInstance.reclaimContributionWithInterest', transaction.tx);
        transaction = await lendingInstance.reclaimContributionWithInterest(investor2, {from: investor2}).should.be.fulfilled;
        reportMethodGasUsed('report', 'investor2', 'lendingInstance.reclaimContributionWithInterest', transaction.tx);
        transaction = await lendingInstance.reclaimLocalNodeFee().should.be.fulfilled;
        reportMethodGasUsed('report', 'ownerLending', 'lendingInstance.reclaimLocalNodeFee', transaction.tx);
        transaction = await lendingInstance.reclaimEthicHubTeamFee().should.be.fulfilled;
        reportMethodGasUsed('report', 'ownerLending', 'lendingInstance.reclaimEthicHubTeamFee', transaction.tx);

        // Show balances
        //console.log('=== FINISH ===');
        //await traceBalancesAllActors();
        // Show reputation
        localNodeRep = await reputationInstance.getLocalNodeReputation(localNode1);
        console.log('Final Local Node Reputation: ' + localNodeRep);
        communityRep = await reputationInstance.getCommunityReputation(community);
        console.log('Final Community Reputation: ' + communityRep);
    });
});

function traceBalancesAllActors() {
    const ownerLendingBalance = utils.fromWei(utils.toBN(web3.eth.getBalance(ownerTruffle)));
    const investor1Balance = utils.fromWei(utils.toBN(web3.eth.getBalance(investor1)));
    const investor2Balance = utils.fromWei(utils.toBN(web3.eth.getBalance(investor2)));
    const investor3Balance = utils.fromWei(utils.toBN(web3.eth.getBalance(investor3)));
    const localNodeBalance = utils.fromWei(utils.toBN(web3.eth.getBalance(localNode1)));
    const teamBalance = utils.fromWei(utils.toBN(web3.eth.getBalance(teamEH)));
    const communityBalance = utils.fromWei(utils.toBN(web3.eth.getBalance(community)));
    console.log('Owner Contract:' + ownerLendingBalance);
    console.log('Investor 1:' + investor1Balance);
    console.log('Investor 2:' + investor2Balance);
    console.log('Investor 3:' + investor3Balance);
    console.log('Local Node:' + localNodeBalance);
    console.log('Team:' + teamBalance);
    console.log('Community:' + communityBalance);
}

function checkLostinTransactions(expected, actual) {
    const lost = expected.sub(actual);
    //console.log("Perdida:" + utils.fromWei(utils.toBN(Math.floor(lost.toNumber())), 'ether'));
    // /* Should be below 0.02 eth */
    lost.should.be.bignumber.below('20000000000000000');
}

// Calculate (gasUsed*gasPrice)
function getTransactionCost(txHash) {
    const gasPrice = web3.eth.getTransaction(txHash).gasPrice;
    const gasUsed = web3.eth.getTransactionReceipt(txHash).gasUsed;
    const txCost = gasPrice.mul(gasUsed);
    console.log('Gas Price:' + utils.fromWei(utils.toBN(gasPrice)));
    console.log('Gas Used:' + gasUsed.toString());
    console.log('Tx Cost:' + utils.fromWei(utils.toBN(txCost)));
    return txCost;
}

function reportMethodGasUsed (filename, role, methodName, txHash, remove = false) {
    if (remove)
        fs.closeSync(fs.openSync(filename + '.csv', 'w'));
    const gasUsed = web3.eth.getTransactionReceipt(txHash).gasUsed;
    fs.appendFileSync(filename + '.csv', role + ',' + methodName + ',' + gasUsed + '\n');
}
/*
 * Call a smart contract function from any keyset in which the caller has the
 *     private and public keys.
 * @param {string} senderPublicKey Public key in key pair.
 * @param {string} senderPrivateKey Private key in key pair.
 * @param {string} contractAddress Address of Solidity contract.
 * @param {string} data Data from the function's `getData` in web3.js.
 * @param {number} value Number of Ethereum wei sent in the transaction.
 * @return {Promise}
 */
function rawTransaction(
    senderPublicKey,
    senderPrivateKey,
    contractAddress,
    data,
    value
) {
    return new Promise((resolve, reject) => {
        let key = new Buffer(senderPrivateKey, 'hex');
        let nonce = web3.toHex(web3.eth.getTransactionCount(senderPublicKey));
        let gasPrice = web3.eth.gasPrice;
        let gasPriceHex = web3.toHex(web3.eth.estimateGas({
            from: contractAddress
        }));
        let gasLimitHex = web3.toHex(5500000);
        let rawTx = {
            nonce: nonce,
            gasPrice: gasPriceHex,
            gasLimit: gasLimitHex,
            data: data,
            to: contractAddress,
            value: web3.toHex(value)
        };
        let tx = new EthereumTx(rawTx);
        tx.sign(key);
        let stx = '0x' + tx.serialize().toString('hex');
        web3.eth.sendRawTransaction(stx, (err, hash) => {
            if (err) {
                reject(err);
            } else {
                resolve(hash);
            }
        });
    });
}
