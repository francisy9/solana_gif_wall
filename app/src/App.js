import './App.css';
import React, {useEffect, useState} from "react";
import idl from "./idl.json";
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Provider, Program, web3 } from '@project-serum/anchor';
const { SystemProgram } = web3;

let baseAccount, bump = null;
const programId = new PublicKey(idl.metadata.address);

const network = clusterApiUrl('devnet');
let resp = null;

// Controls when we want to acknowledge when a transaction is done processed -> when one node confirms our transaction
const opts = {
  preflightCommitment: "processed"
}

const App = () => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [gifLink, setGifLink] = useState("");
  const [gifList, setGifList] = useState([]);

  const checkWalletConnection = async() => {
    try {
      const {solana} = window;
      if (solana && solana.isPhantom) {
        console.log("Sol object found");
      } else {
        console.log("Get Solana");
        window.open("https://phantom.app/", "_blank");
        return;
      }
      
      resp = await solana.connect({onlyIfTrusted: true});
      setWalletAddress(resp.publicKey.toString());
    } catch (error) {
      console.log(error);
    }
  };

  const connectWallet = async() => {
    const resp = await window.solana.connect();
    setWalletAddress(resp.publicKey.toString());
  };

  const renderNotConnected = () => {
    return <button
    className="cta-button connect-wallet-button"
    onClick={connectWallet}>
      Connect button
    </button>
  };

  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(
      connection, window.solana, opts.preflightCommitment,
    );
    return provider;
  }

  const createGifAccount = async() => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programId, provider);
      console.log("ping");
      await program.rpc.startStuffOff(bump, {
        accounts: {
          baseAccount: baseAccount,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
      });
      console.log("Created new gif account with address: ", baseAccount.toString());
      await getGifList();

    } catch (error) {
      console.log("Failed to create Gif account", error);
    }
  }

  const getGifList = async() => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programId, provider);
      const account = await program.account.baseAccount.fetch(baseAccount);

      setGifList(account.gifList);

    } catch (error) {
      console.log("Error in fetching gif list: ", error);
      setGifList(null);

    }
  }

  const handleGifLink = (event) => {
    setGifLink(event.target.value);
  };

  const sendGif = async() => {
    if (gifLink) {
      console.log("Gif Link: ", gifLink);
      try {
        const provider = getProvider();
        const program = new Program(idl, programId, provider);

        await program.rpc.addGif(gifLink, {
          accounts: {
            baseAccount: baseAccount,
            user: provider.wallet.publicKey,
          },
        });

        getGifList();
        console.log("Successfully pushed gif link: ", gifLink, " to fif account.");
        setGifLink("");

      } catch (error) {
        console.log("Failed to push gif list: ", error);
      }

    } else {
      console.log("Please input a value");
    }
  }

  const upVote = async (id) => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programId, provider);

      await program.rpc.upVote (id, {
        accounts: {
          baseAccount: baseAccount,
        },
      })
      getGifList();
    } catch (error) {
      console.log("Can't down vote: ", error);
    }
  }
  
  const downVote = async (id) => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programId, provider);

      await program.rpc.downVote (id, {
        accounts: {
          baseAccount: baseAccount,
        },
      })
      getGifList();
    } catch (error) {
      console.log("Can't down vote: ", error);
    }
  }

  // Calls program to send 0.1 sol to gif poster
  const tip = async(address) => {
    const provider = getProvider();
    const program = new Program(idl, programId, provider);

    try {
      const tx = await program.rpc.sendSol("100000000", {
        accounts: {
          from: walletAddress,
          to: address,
          systemProgram: SystemProgram.programId,
        },
      });

      console.log("Transaction successful: ", tx);
    } catch (error) {
      console.log("Couldn't send tip: ", error);
    }
  }

  const voteButtons = (item) => (
    <div className="vote-div">
      <p>{item.vote}</p>
      <svg width="24px" height="24px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" onClick={() => upVote(item.id.toNumber())}>
        <path d="M4 14h4v7a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-7h4a1.001 1.001 0 0 0 .781-1.625l-8-10c-.381-.475-1.181-.475-1.562 0l-8 10A1.001 1.001 0 0 0 4 14z"/>
      </svg>
      <svg width="24px" height="24px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" onClick={() => downVote(item.id.toNumber())}>
        <path d="M20.901 10.566A1.001 1.001 0 0 0 20 10h-4V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v7H4a1.001 1.001 0 0 0-.781 1.625l8 10a1 1 0 0 0 1.562 0l8-10c.24-.301.286-.712.12-1.059z"/>
      </svg>
    </div>);

  const tipUserButton = (item) => (
    <div>
    <button
      className='tip-button'
      onClick={()=>  tip(item.userAddress)}>Tip</button>
      <a 
      className='user-address' 
      href={"https://explorer.solana.com/address/" + item.userAddress.toString() + "?cluster=devnet"} 
      target="_blank" 
      rel='noreferrer'
      style={{display:"inline-block"}}>
        {item.userAddress.toString().slice(0, 25)+"..."}
      </a>
    </div>
  );

  const renderConnected = () => {
    if (!gifList) {
      return (
        <div className="connected-container">
          <button className="cta-button submit-gif-button" onClick={createGifAccount}>
            Do one time initialization for gif program account
          </button>
        </div>
      )
    } else {
      return (
        <div className="connected-container">
          <form onSubmit={(event) => {
            sendGif();
            event.preventDefault();
          }}>
            <input type="text" placeholder="Enter cartoon gif link" onChange={handleGifLink} value={gifLink} />
            <button type="submit" className="cta-button submit-gif-button"> Submit</button>
          </form>
          <div className="gif-grid">
            {gifList.map((item) => (
              <div style={{display: "flex"}} key={item.id.toNumber()}>
                {voteButtons(item)}
                <div className="gif-item" style={{display: "inline-block"}}>
                <img src={item.gifLink} alt={item}></img>
                {tipUserButton(item)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
  }
  

  useEffect(() => {
    const onLoad = async () => {
      await checkWalletConnection();
      [baseAccount, bump] = await PublicKey.findProgramAddress([Buffer.from("base_account")], programId)
    };
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  },[]);

  useEffect(() => {
    if (walletAddress) {
      console.log("Fetching GIF list");
      console.log("Fetching gif list...");
      getGifList();
    }
  }, [walletAddress]);
  return (
    <div className="App">
      <div className={walletAddress ? "authed-container ": "container"}>
        <div className="header-container">
          <p className="header">👾 Cartoon GIF Portal</p>
          <p className="sub-text">
            Submit your gif to make snoopy happy:)
          </p>
          {walletAddress ? renderConnected() : renderNotConnected()}
        </div>
        <div className="footer-container">
        </div>
      </div>
    </div>
  );
};

export default App;
