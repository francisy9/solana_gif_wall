const anchor = require('@project-serum/anchor');
const { SystemProgram } = anchor.web3;
const BigNumber = require('bignumber.js');
var assert = require('assert');
const Math = require('mathjs');

describe('Initialize base account', async() => {
  // Create and set provider
  const provider = anchor.Provider.env(); 
  anchor.setProvider(provider);

  // Read deployed program from work space then compiles code in libs.rs then deploys on a local validator
  const program = anchor.workspace.Myepicproject; 

  let baseAccount, bump = null;
  [baseAccount, bump] = await anchor.web3.PublicKey.findProgramAddress([Buffer.from("base_account")], program.programId);

  it('Initialize base account; if initialized check if error matches already in use message', async() => {
    // Execute RPC
    // Arguments passed match up with arg parameters initialized at pub struct start_stuff_off
    try {
      let tx = await program.rpc.startStuffOff(bump, {
        accounts: {
          baseAccount: baseAccount,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
      });

      // Fetch data from the account
      let account = await program.account.baseAccount.fetch(baseAccount);
      console.log("👀 Total Gifs", account.totalGifs.toString());

      console.log("📝 Create account transaction signature", tx);
      assert.equal(account.totalGifs.toString(), "0");
    } catch (error) {
      console.log(error);
      assert.equal(error.logs[3], 'Allocate: account Address { address: 3FNk8hkqFnf5vNFgGTPqYkbDUXduXCS7QY65pUncSEG5, base: None } already in use');
    }
    
  });
  
  it("Testing add gif function", async() => {
    account = await program.account.baseAccount.fetch(baseAccount);
    const prevTotal = account.totalGifs.toNumber();

    let tx2 = await program.rpc.addGif("insert gif link here", {
      accounts: {
        baseAccount: baseAccount,
        user: provider.wallet.publicKey,
      },
    });
  
    console.log("📝 Add gif transaction signature", tx2);
    
    account = await program.account.baseAccount.fetch(baseAccount);
    const finalTotal = account.totalGifs.toNumber();
    assert.equal(prevTotal + 1, finalTotal);
  });

  it("Testing Up Vote", async() => {
    account = await program.account.baseAccount.fetch(baseAccount);
    const prevVote = account.gifList[0].vote;

    let upVotetx = await program.rpc.upVote(0,{
      accounts: {
        baseAccount: baseAccount,
      },
    })

    console.log("Up vote successful: ", upVotetx);
    account = await program.account.baseAccount.fetch(baseAccount);
    const finalVote = account.gifList[0].vote;
    assert.equal(prevVote + 1, finalVote);
  });

  it("Testing Down Vote", async() => {
    account = await program.account.baseAccount.fetch(baseAccount);
    prevVote = account.gifList[0].vote;
    let donwVotetx = await program.rpc.downVote(0,{
      accounts: {
        baseAccount: baseAccount,
      },
    })
    console.log("Down vote tx: ", donwVotetx);
    account = await program.account.baseAccount.fetch(baseAccount);
    finalVote = account.gifList[0].vote;
    assert.equal(prevVote - 1, finalVote);
  })

  it("Testing tip function", async() => {
    let fromAccount = anchor.web3.Keypair.generate();
    let airdropSig = await provider.connection.requestAirdrop(
      fromAccount.publicKey,
      1100000000
    );
    await provider.connection.confirmTransaction(airdropSig);

    let prevBalance = await provider.connection.getBalance(provider.wallet.payer.publicKey);
    prevBalance = Math.round(prevBalance/1000000) * 1000000;
    let sendSolTx = await program.rpc.sendSol("1000000000", {
      accounts: {
        from: fromAccount.publicKey,
        to: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      },
      signers: [fromAccount]
    })
    let finalBalance = await provider.connection.getBalance(provider.wallet.payer.publicKey);
    finalBalance = Math.round(finalBalance/1000000) * 1000000;
    assert.equal(prevBalance + 1000000000, finalBalance);
  })
});

