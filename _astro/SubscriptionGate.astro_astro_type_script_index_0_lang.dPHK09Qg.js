class p{constructor(t){this.trackerUrl=t||"http://localhost:3847",this.tokenKey="crier_subscriber_token"}getToken(){return localStorage.getItem(this.tokenKey)}setToken(t){localStorage.setItem(this.tokenKey,t)}clearToken(){localStorage.removeItem(this.tokenKey)}async checkAccess(t,n){const e=this.getToken(),r={"Content-Type":"application/json"};e&&(r["X-Subscriber-Token"]=e);try{const s=await fetch(`${this.trackerUrl}/api/blogs/${t}/posts/${encodeURIComponent(n)}/access`,{headers:r});if(!s.ok)throw new Error(`HTTP ${s.status}`);return await s.json()}catch(s){return console.error("Access check failed:",s),{access:!1,options:{subscription:{price:500,currency:"usd",period:"month"},pay_per_read:{price:10,currency:"usd",x402:!0}}}}}unlockContent(t){const n=t.replace(/[^a-zA-Z0-9]/g,"-"),e=document.getElementById(`paywall-${n}`),r=document.getElementById(`content-${n}`);e&&(e.style.display="none"),r&&(r.style.display="block")}renderPaymentOptions(t,n,e){const r=n.replace(/[^a-zA-Z0-9]/g,"-"),s=document.querySelector(`#paywall-${r} .payment-options`);if(!s||!e)return;const c=(a,d)=>new Intl.NumberFormat("en-US",{style:"currency",currency:d.toUpperCase()}).format(a/100);let i="";if(e.subscription){const a=c(e.subscription.price,e.subscription.currency);i+=`
        <div class="payment-option" data-type="subscription">
          <div>
            <div class="price">${a}/${e.subscription.period}</div>
            <div class="description">Full access to all posts</div>
          </div>
          <button class="btn-primary" onclick="window.subscriptionManager.subscribe('${t}', 'standard')">
            Subscribe
          </button>
        </div>
      `}if(e.subscription){const a=c(e.subscription.price*2,e.subscription.currency);i+=`
        <div class="payment-option" data-type="supporter">
          <div>
            <div class="price">${a}/${e.subscription.period}</div>
            <div class="description">Supporter tier - same access, helps fund development</div>
          </div>
          <button class="btn-primary" onclick="window.subscriptionManager.subscribe('${t}', 'supporter')">
            Support
          </button>
        </div>
      `}if(e.pay_per_read){const a=c(e.pay_per_read.price,e.pay_per_read.currency);i+=`
        <div class="payment-option" data-type="pay-per-read">
          <div>
            <div class="price">${a} one-time</div>
            <div class="description">Just this post${e.pay_per_read.x402?" • Agent-friendly (x402)":""}</div>
          </div>
          <button class="btn-primary" onclick="window.subscriptionManager.payPerRead('${t}', '${n}')">
            Pay Now
          </button>
        </div>
      `}s.innerHTML=i,window.subscriptionManager=this}async subscribe(t,n){const e=prompt("Enter your email for subscription:");if(e)try{const s=await(await fetch(`${this.trackerUrl}/api/blogs/${t}/checkout`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:e,tier:n,success_url:`${window.location.origin}/subscribe/success`,cancel_url:`${window.location.origin}/subscribe/cancel`})})).json();s.checkout_url?window.location.href=s.checkout_url:alert("Failed to create checkout session")}catch(r){console.error("Checkout error:",r),alert("Failed to initiate checkout. Please try again.")}}async payPerRead(t,n){try{const e=await fetch(`${this.trackerUrl}/api/blogs/${t}/posts/${encodeURIComponent(n)}/pay`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({})});if(e.status===402){const s=await e.json();this.handleX402Payment(t,n,s.payment_requirements);return}const r=await e.json();r.client_secret?this.showStripePayment(t,n,r):alert("Payment initiation failed")}catch(e){console.error("Pay-per-read error:",e),alert("Failed to initiate payment. Please try again.")}}handleX402Payment(t,n,e){const r=`This post supports x402 machine payments.

Required: ${e.required_amount} USDC on ${e.network}
Receiver: ${e.receiver_address?.slice(0,20)}...

If you're an agent, send payment and retry.`;alert(r),localStorage.setItem(`crier_pending_payment_${t}_${n}`,JSON.stringify({requirements:e,timestamp:Date.now()}))}showStripePayment(t,n,e){alert(`Stripe payment integration would open here.
Amount: ${e.amount} ${e.currency}

In production, this would show Stripe Elements.`)}async verifyToken(t){this.setToken(t),window.location.reload()}}document.addEventListener("DOMContentLoaded",()=>{const o=document.getElementById("subscriber-token-btn");o&&o.addEventListener("click",()=>{const t=prompt("Enter your subscriber access token:");t&&new p().verifyToken(t)})});document.addEventListener("DOMContentLoaded",()=>{document.querySelectorAll(".content-gated").forEach(async t=>{const n=t.dataset.blogSlug,e=t.dataset.postPath,r=t.dataset.trackerUrl;if(!n||!e)return;const s=new p(r),c=await s.checkAccess(n,e);c.access?s.unlockContent(e):s.renderPaymentOptions(n,e,c.options)})});
