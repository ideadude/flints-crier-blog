/* Buy It — chart, calculator, offer slider, form. No dependencies. */
(function () {
	"use strict";

	var fmtUSD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
	var fmtNum = new Intl.NumberFormat("en-US");

	function fmtShort(n) {
		if (n >= 1e9) return "$" + (n / 1e9).toFixed(2).replace(/\.?0+$/, "") + "B";
		if (n >= 1e6) return "$" + (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
		if (n >= 1e3) return "$" + Math.round(n / 1e3) + "K";
		return fmtUSD.format(n);
	}

	function fillTrack(input) {
		var min = parseFloat(input.min), max = parseFloat(input.max), val = parseFloat(input.value);
		input.style.setProperty("--fill", ((val - min) / (max - min)) * 100 + "%");
	}

	/* ============ Financials chart (SVG, hand-rolled) ============ */
	var FIN = {
		years: [2023, 2024, 2025, 2026, 2027, 2028],
		revenue: [1645294, 1952176, 2308968, 2606166, 2941618, 3320248],
		profit: [420516, 703221, 912199, 1015952, 1271893, 1567037],
		actualThrough: 2025
	};

	function drawChart() {
		var host = document.getElementById("ssbi-chart");
		if (!host) return;
		var W = 960, H = 380, padL = 70, padR = 16, padT = 20, padB = 44;
		var plotW = W - padL - padR, plotH = H - padT - padB;
		var maxY = 3500000;
		var n = FIN.years.length;
		var groupW = plotW / n;
		var barW = groupW * 0.28;

		var s = '<svg viewBox="0 0 ' + W + " " + H + '" xmlns="http://www.w3.org/2000/svg">';

		// gridlines + y labels
		for (var y = 0; y <= maxY; y += 500000) {
			var gy = padT + plotH - (y / maxY) * plotH;
			s += '<line x1="' + padL + '" y1="' + gy + '" x2="' + (W - padR) + '" y2="' + gy + '" stroke="rgba(1,25,53,0.10)" stroke-width="1"/>';
			s += '<text x="' + (padL - 10) + '" y="' + (gy + 4) + '" text-anchor="end" font-size="12" fill="#4a5762" font-family="JetBrains Mono, monospace">' + (y === 0 ? "0" : "$" + y / 1e6 + "M") + "</text>";
		}

		FIN.years.forEach(function (yr, i) {
			var cx = padL + groupW * i + groupW / 2;
			var est = yr > FIN.actualThrough;
			var rH = (FIN.revenue[i] / maxY) * plotH;
			var pH = (FIN.profit[i] / maxY) * plotH;
			var dash = est ? ' stroke="#4a5762" stroke-width="1.5" stroke-dasharray="4,3"' : "";
			var rFill = est ? "rgba(12,61,84,0.18)" : "#0c3d54";
			var pFill = est ? "rgba(232,113,2,0.18)" : "#e87102";

			s += '<rect x="' + (cx - barW - 3) + '" y="' + (padT + plotH - rH) + '" width="' + barW + '" height="' + rH + '" rx="0" fill="' + rFill + '"' + dash + ">" +
				"<title>" + yr + " revenue: " + fmtUSD.format(FIN.revenue[i]) + "</title></rect>";
			s += '<rect x="' + (cx + 3) + '" y="' + (padT + plotH - pH) + '" width="' + barW + '" height="' + pH + '" rx="0" fill="' + pFill + '"' + dash + ">" +
				"<title>" + yr + " profit: " + fmtUSD.format(FIN.profit[i]) + "</title></rect>";
			s += '<text x="' + cx + '" y="' + (H - 20) + '" text-anchor="middle" font-size="14" font-weight="600" fill="#1d2832" font-family="Figtree, sans-serif">' + yr + (est ? "E" : "") + "</text>";
			// value labels on revenue bars
			s += '<text x="' + (cx - 3 - barW / 2) + '" y="' + (padT + plotH - rH - 8) + '" text-anchor="middle" font-size="11" fill="#4a5762" font-family="JetBrains Mono, monospace">' + fmtShort(FIN.revenue[i]) + "</text>";
		});

		s += "</svg>";
		host.innerHTML = s;
	}

	/* ============ Valuation calculator ============ */
	var BASE_REV_2026 = 2606166; // core forecast incl. current hosting ramp
	var ASK = 50000000;

	function calc() {
		var years = +document.getElementById("calc-years").value;
		var growth = +document.getElementById("calc-growth").value / 100;
		var hosting = +document.getElementById("calc-hosting").value;
		var services = +document.getElementById("calc-services").value;
		var multiple = +document.getElementById("calc-multiple").value;

		var core = BASE_REV_2026 * Math.pow(1 + growth, years);
		var hostingRev = hosting * 100 * 12;
		var totalRev = core + hostingRev + services;
		var valuation = totalRev * multiple;
		var estProfit = core * 0.40 + hostingRev * 0.5 + services * 0.75;
		var profitMult = estProfit > 0 ? valuation / estProfit : 0;

		document.getElementById("calc-years-out").textContent = years + (years === 1 ? " year" : " years");
		document.getElementById("calc-growth-out").textContent = Math.round(growth * 100) + "%/yr";
		document.getElementById("calc-hosting-out").textContent = fmtNum.format(hosting);
		document.getElementById("calc-services-out").textContent = fmtShort(services) + "/yr";
		document.getElementById("calc-multiple-out").textContent = multiple + "×";

		document.getElementById("calc-valuation").textContent = fmtShort(valuation);
		document.getElementById("calc-detail").textContent =
			"Revenue in " + (2026 + years) + ": " + fmtShort(totalRev) +
			" (core " + fmtShort(core) + " + hosting " + fmtShort(hostingRev) + " + services " + fmtShort(services) + ")" +
			" · est. profit " + fmtShort(estProfit) + " · " + profitMult.toFixed(0) + "× profit";

		var verdict = document.getElementById("calc-verdict");
		if (valuation >= ASK * 2) {
			verdict.textContent = "Your own model says " + fmtShort(valuation) + ". The ask is $50M. At this point we should be negotiating you DOWN.";
		} else if (valuation >= ASK) {
			verdict.textContent = "Your knobs, our numbers: " + fmtShort(valuation) + " ≥ $50M. The form is below. Bring the slider.";
		} else if (valuation >= ASK * 0.5) {
			verdict.textContent = "Close. Your model says " + fmtShort(valuation) + ". Nudge the hosting knob — that one's real, we checked.";
		} else {
			verdict.textContent = "Your model: " + fmtShort(valuation) + ". Our price: $50M. One of us is wrong, and we're the ones with the margins.";
		}
	}

	/* ============ Offer slider ============ */
	var MILESTONES = [
		{ min: 50e6, quip: "The list price. About 19× revenue — Substack last raised at ~24×, so we are, frankly, priced to move." },
		{ min: 60e6, quip: "Above ask without being asked. A serious person. Kim has opened your firm's website in a tab." },
		{ min: 75e6, quip: "Three-quarters of a Gumroad. Jason has stopped saying “we're not really for sale” mid-sentence." },
		{ min: 100e6, quip: "Gumroad's entire 2021 valuation — except this one is profitable and nobody had to write a Medium post about it." },
		{ min: 120e6, quip: "Deal sweetener unlocked: Jason and Kim stay on an extra year." },
		{ min: 150e6, quip: "Now exceeding the GDP of several very small islands. The Colemans are Googling them." },
		{ min: 175e6, quip: "The basement server is included. So is Flint, the AI daemon who built this page. He counts as headcount and runs on electricity and spite." },
		{ min: 200e6, quip: "One-fifth of a Substack, all of a Circle. Final answer. There is no third slider." }
	];

	var PERKS = [
		{ min: 60e6, text: "Founders reply to your email within one business day" },
		{ min: 75e6, text: "Kim laughs at your jokes in board meetings (genuine)" },
		{ min: 90e6, text: "Jason explains the entire codebase, including the parts from 2011" },
		{ min: 120e6, text: "Jason and Kim stay on an extra year" },
		{ min: 135e6, text: "Jason stops saying “we could build that ourselves” in vendor meetings (year one only)" },
		{ min: 150e6, text: "Second extra year. Kim runs your portfolio's WordPress practice" },
		{ min: 175e6, text: "Flint the basement AI, his gaming PC, and his opinions — included" },
		{ min: 190e6, text: "The Colemans attend your annual LP meeting and are visibly pleasant" }
	];

	var prevPerkCount = -1;

	function updateOffer() {
		var slider = document.getElementById("offer-slider");
		if (!slider) return;
		var val = +slider.value;
		fillTrack(slider);

		document.getElementById("offer-amount-display").textContent = fmtUSD.format(val);
		var fOffer = document.getElementById("f-offer");
		if (fOffer) fOffer.value = fmtUSD.format(val);

		var quip = MILESTONES[0].quip;
		for (var i = 0; i < MILESTONES.length; i++) {
			if (val >= MILESTONES[i].min) quip = MILESTONES[i].quip;
		}
		document.getElementById("offer-quip").textContent = quip;

		var unlocked = PERKS.filter(function (p) { return val >= p.min; });
		var ul = document.getElementById("offer-perks");
		if (unlocked.length !== prevPerkCount) {
			ul.innerHTML = unlocked.map(function (p) { return "<li>" + p.text + "</li>"; }).join("");
			prevPerkCount = unlocked.length;
		}
	}

	/* ============ Form submit ============ */
	function bindForm() {
		var form = document.getElementById("offer-form");
		if (!form) return;
		var status = document.getElementById("form-status");
		var btn = document.getElementById("offer-submit");

		form.addEventListener("submit", function (e) {
			e.preventDefault();
			status.className = "ssbi-form-status";
			status.textContent = "Transmitting to the basement…";
			btn.disabled = true;

			var payload = {
				name: document.getElementById("f-name").value,
				email: document.getElementById("f-email").value,
				firm: document.getElementById("f-firm").value,
				url: document.getElementById("f-url").value,
				funds_source: document.getElementById("f-funds").value,
				message: document.getElementById("f-message").value,
				offer_amount: +document.getElementById("offer-slider").value,
				website_extra: document.getElementById("f-website-extra").value,
				form_ts: window.SSBI.loadedAt,
				referrer: document.referrer || ""
			};

			setTimeout(function () {
				btn.disabled = false;
				status.className = "ssbi-form-status ssbi-ok";
				status.textContent = "Preview mode: your offer of " + fmtUSD.format(payload.offer_amount) + " has been noted in spirit. The live offer desk \u2014 with the database \u2014 opens at strangerstudios.com/buy-it/.";
			}, 700);
		});
	}

	/* ============ Init ============ */
	document.addEventListener("DOMContentLoaded", function () {
		drawChart();
		bindForm();

		["calc-years", "calc-growth", "calc-hosting", "calc-services", "calc-multiple"].forEach(function (id) {
			var el = document.getElementById(id);
			if (!el) return;
			el.addEventListener("input", function () { fillTrack(el); calc(); });
			fillTrack(el);
		});
		calc();

		var slider = document.getElementById("offer-slider");
		if (slider) {
			slider.addEventListener("input", updateOffer);
			updateOffer();
		}
	});
})();
