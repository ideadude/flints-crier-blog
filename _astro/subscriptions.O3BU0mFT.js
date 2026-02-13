class d{constructor(t){this.trackerUrl=t||"http://localhost:3847",this.tokenKey="crier_subscriber_token"}getToken(){return localStorage.getItem(this.tokenKey)}setToken(t){localStorage.setItem(this.tokenKey,t)}clearToken(){localStorage.removeItem(this.tokenKey)}async checkAccess(t,r){const e=this.getToken(),n={"Content-Type":"application/json"};e&&(n["X-Subscriber-Token"]=e);try{const s=await fetch(`${this.trackerUrl}/api/blogs/${t}/posts/${encodeURIComponent(r)}/access`,{headers:n});if(!s.ok)throw new Error(`HTTP ${s.status}`);return await s.json()}catch(s){return console.error("Access check failed:",s),{access:!1,options:{subscription:{price:500,currency:"usd",period:"month"},pay_per_read:{price:10,currency:"usd",x402:!0}}}}}unlockContent(t){const r=t.replace(/[^a-zA-Z0-9]/g,"-"),e=document.getElementById(`paywall-${r}`),n=document.getElementById(`content-${r}`);e&&(e.style.display="none"),n&&(n.style.display="block")}renderPaymentOptions(t,r,e){const n=r.replace(/[^a-zA-Z0-9]/g,"-"),s=document.querySelector(`#paywall-${n} .payment-options`);if(!s||!e)return;const o=(i,p)=>new Intl.NumberFormat("en-US",{style:"currency",currency:p.toUpperCase()}).format(i/100);let a="";if(e.subscription){const i=o(e.subscription.price,e.subscription.currency);a+=`
        <div class="payment-option" data-type="subscription">
          <div>
            <div class="price">${i}/${e.subscription.period}</div>
            <div class="description">Full access to all posts</div>
          </div>
          <button class="btn-primary" onclick="window.subscriptionManager.subscribe('${t}', 'standard')">
            Subscribe
          </button>
        </div>
      `}if(e.subscription){const i=o(e.subscription.price*2,e.subscription.currency);a+=`
        <div class="payment-option" data-type="supporter">
          <div>
            <div class="price">${i}/${e.subscription.period}</div>
            <div class="description">Supporter tier - same access, helps fund development</div>
          </div>
          <button class="btn-primary" onclick="window.subscriptionManager.subscribe('${t}', 'supporter')">
            Support
          </button>
        </div>
      `}if(e.pay_per_read){const i=o(e.pay_per_read.price,e.pay_per_read.currency);a+=`
        <div class="payment-option" data-type="pay-per-read">
          <div>
            <div class="price">${i} one-time</div>
            <div class="description">Just this post${e.pay_per_read.x402?" • Agent-friendly (x402)":""}</div>
          </div>
          <button class="btn-primary" onclick="window.subscriptionManager.payPerRead('${t}', '${r}')">
            Pay Now
          </button>
        </div>
      `}s.innerHTML=a,window.subscriptionManager=this}async subscribe(t,r){const e=prompt("Enter your email for subscription:");if(e)try{const s=await(await fetch(`${this.trackerUrl}/api/blogs/${t}/checkout`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:e,tier:r,success_url:`${window.location.origin}/subscribe/success`,cancel_url:`${window.location.origin}/subscribe/cancel`})})).json();s.checkout_url?window.location.href=s.checkout_url:alert("Failed to create checkout session")}catch(n){console.error("Checkout error:",n),alert("Failed to initiate checkout. Please try again.")}}async payPerRead(t,r){try{const e=await fetch(`${this.trackerUrl}/api/blogs/${t}/posts/${encodeURIComponent(r)}/pay`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({})});if(e.status===402){const s=await e.json();this.handleX402Payment(t,r,s.payment_requirements);return}const n=await e.json();n.client_secret?this.showStripePayment(t,r,n):alert("Payment initiation failed")}catch(e){console.error("Pay-per-read error:",e),alert("Failed to initiate payment. Please try again.")}}handleX402Payment(t,r,e){const n=`This post supports x402 machine payments.

Required: ${e.required_amount} USDC on ${e.network}
Receiver: ${e.receiver_address?.slice(0,20)}...

If you're an agent, send payment and retry.`;alert(n),localStorage.setItem(`crier_pending_payment_${t}_${r}`,JSON.stringify({requirements:e,timestamp:Date.now()}))}showStripePayment(t,r,e){alert(`Stripe payment integration would open here.
Amount: ${e.amount} ${e.currency}

In production, this would show Stripe Elements.`)}async verifyToken(t){this.setToken(t),window.location.reload()}}document.addEventListener("DOMContentLoaded",()=>{const c=document.getElementById("subscriber-token-btn");c&&c.addEventListener("click",()=>{const t=prompt("Enter your subscriber access token:");t&&new d().verifyToken(t)})});export{d as SubscriptionManager};
