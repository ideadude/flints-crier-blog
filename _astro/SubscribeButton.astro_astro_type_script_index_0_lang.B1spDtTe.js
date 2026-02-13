const y="modulepreload",v=function(s){return"/"+s},b={},g=function(i,o,u){let l=Promise.resolve();if(o&&o.length>0){let n=function(e){return Promise.all(e.map(r=>Promise.resolve(r).then(a=>({status:"fulfilled",value:a}),a=>({status:"rejected",reason:a}))))};document.getElementsByTagName("link");const t=document.querySelector("meta[property=csp-nonce]"),d=t?.nonce||t?.getAttribute("nonce");l=n(o.map(e=>{if(e=v(e),e in b)return;b[e]=!0;const r=e.endsWith(".css"),a=r?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${e}"]${a}`))return;const c=document.createElement("link");if(c.rel=r?"stylesheet":y,r||(c.as="script"),c.crossOrigin="",c.href=e,d&&c.setAttribute("nonce",d),document.head.appendChild(c),r)return new Promise((m,f)=>{c.addEventListener("load",m),c.addEventListener("error",()=>f(new Error(`Unable to preload CSS for ${e}`)))})}))}function p(n){const t=new Event("vite:preloadError",{cancelable:!0});if(t.payload=n,window.dispatchEvent(t),!t.defaultPrevented)throw n}return l.then(n=>{for(const t of n||[])t.status==="rejected"&&p(t.reason);return i().catch(p)})};document.addEventListener("DOMContentLoaded",async()=>{const s=document.querySelector(".subscribe-container"),i=document.getElementById("subscribe-btn"),o=document.getElementById("subscribe-dropdown");if(!s||!i||!o)return;const u=s.dataset.blogSlug,l=s.dataset.trackerUrl;localStorage.getItem("crier_subscriber_token")&&(i.textContent="Subscribed",i.classList.add("subscribed"));try{const t=await(await fetch(`${l}/api/blogs/${u}/payment-info`)).json();if(t.stripe_connected){const d=e=>new Intl.NumberFormat("en-US",{style:"currency",currency:t.currency.toUpperCase()}).format(e/100);o.querySelector(".dropdown-content").innerHTML=`
          <div class="price-info">
            <div class="subscription-price">
              ${d(t.subscription_price)}/month
            </div>
            <div class="pay-per-read-price">
              or ${d(t.pay_per_read_price)} per post
            </div>
          </div>
          <a href="#" class="dropdown-action" id="subscribe-action">
            Subscribe Now
          </a>
          <a href="#" class="dropdown-action secondary" id="token-action">
            Enter Access Token
          </a>
        `,document.getElementById("subscribe-action")?.addEventListener("click",e=>{e.preventDefault(),g(async()=>{const{SubscriptionManager:r}=await import("./subscriptions.O3BU0mFT.js");return{SubscriptionManager:r}},[]).then(({SubscriptionManager:r})=>{new r(l).subscribe(u,"standard")})}),document.getElementById("token-action")?.addEventListener("click",e=>{e.preventDefault();const r=prompt("Enter your subscriber access token:");r&&(localStorage.setItem("crier_subscriber_token",r),window.location.reload())})}else o.querySelector(".dropdown-content").innerHTML=`
          <div class="not-configured">
            Subscription not yet configured for this blog.
          </div>
        `,i.disabled=!0}catch(n){console.error("Failed to load payment info:",n)}i.addEventListener("click",()=>{const n=o.style.display==="block";o.style.display=n?"none":"block"}),document.addEventListener("click",n=>{s.contains(n.target)||(o.style.display="none")})});
