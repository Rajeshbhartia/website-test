// ZOHO chat click
// $("#live-chat").click(function () {
// 	$(".zsiq_float").click();
// });

// counter
(function ($) {
	$.fn.countTo = function (options) {
		options = options || {};

		return $(this).each(function () {
			// set options for current element
			var settings = $.extend({}, $.fn.countTo.defaults, {
				from: $(this).data('from'),
				to: $(this).data('to'),
				speed: $(this).data('speed'),
				refreshInterval: $(this).data('refresh-interval'),
				decimals: $(this).data('decimals')
			}, options);

			// how many times to update the value, and how much to increment the value on each update
			var loops = Math.ceil(settings.speed / settings.refreshInterval),
				increment = (settings.to - settings.from) / loops;

			// references & variables that will change with each update
			var self = this,
				$self = $(this),
				loopCount = 0,
				value = settings.from,
				data = $self.data('countTo') || {};

			$self.data('countTo', data);

			// if an existing interval can be found, clear it first
			if (data.interval) {
				clearInterval(data.interval);
			}
			data.interval = setInterval(updateTimer, settings.refreshInterval);

			// initialize the element with the starting value
			render(value);

			function updateTimer() {
				value += increment;
				loopCount++;

				render(value);

				if (typeof (settings.onUpdate) == 'function') {
					settings.onUpdate.call(self, value);
				}

				if (loopCount >= loops) {
					// remove the interval
					$self.removeData('countTo');
					clearInterval(data.interval);
					value = settings.to;

					if (typeof (settings.onComplete) == 'function') {
						settings.onComplete.call(self, value);
					}
				}
			}

			function render(value) {
				var formattedValue = settings.formatter.call(self, value, settings);
				$self.html(formattedValue);
			}
		});
	};

	$.fn.countTo.defaults = {
		from: 0,               // the number the element should start at
		to: 0,                 // the number the element should end at
		speed: 1000,           // how long it should take to count between the target numbers
		refreshInterval: 100,  // how often the element should be updated
		decimals: 0,           // the number of decimal places to show
		formatter: formatter,  // handler for formatting the value before rendering
		onUpdate: null,        // callback method for every time the element is updated
		onComplete: null       // callback method for when the element finishes updating
	};

	function formatter(value, settings) {
		return value.toFixed(settings.decimals);
	}
}(jQuery));

jQuery(function ($) {
	// custom formatting example
	$('.count-number').data('countToOptions', {
		formatter: function (value, options) {
			return value.toFixed(options.decimals).replace(/\B(?=(?:\d{3})+(?!\d))/g, ',');
		}
	});

	// start all the timers
	$('.timer').each(count);

	function count(options) {
		var $this = $(this);
		options = $.extend({}, options || {}, $this.data('countToOptions') || {});
		$this.countTo(options);
	}
});

function redirect(pageName) {
	window.location.href = `/${pageName}`
}

// menu collepse
$(document).on('click', function () {
	$('.right-section .collapse').collapse('hide');
})

$(document).ready(function () {
	$(".carousel").owlCarousel({
		loop: true,
		margin:10,
		responsiveClass:true,
		autoplay:true,
		navText : ["",""],
		mouseDrag: true,
		touchDrag: true,
		autoplayTimeout: 2500,
		autoplayHoverPause: true,
		smartSpeed: 500,
		slideTransition: 'linear',
		fluidSpeed: true,
		responsive:{
			0:{
				items:2,
				nav:true
			},
			600:{
				items:3,
				nav:false
			},
			1000:{
				items:5,
				nav:true,
				loop:false
			}
		}
	})
});

// home page main slider
$(document).ready(function () {
	$(".home-slider").owlCarousel({
		loop:true,
		margin:0,
		autoplay:true,
		mouseDrag: false,
		touchDrag: true,
		autoplayTimeout: 4000,
		autoplayHoverPause: true,
		items:1,
		nav: true,
	})
});

$(document).ready(() => {
	let url = location.href.replace(/\/$/, "");

	$('#careerBtn').click(function(){
		$('html, body').animate({scrollTop:500},'50');
	});

	if (location.hash) {
		let id = location.hash
		id = id.charAt(id.length - 1) === "/" ? id.substring(0, id.length - 1) : id
		$(id).addClass("active show")
		$(`${id}_tab`).addClass("active")

		const hash = url.split("#");
		$('#myTab a[href="#' + hash[1] + '"]').tab("show");
		url = location.href.replace(/\/#/, "#");
		history.replaceState(null, null, url);
		setTimeout(() => {
			$(window).scrollTop(0);
		}, 400);
	} else {
		if ($("#nav-tab .nav-link")) {
			$("#nav-tab .nav-link:first-child").addClass("active")
			$("#nav-tabContent .tab-pane:first-child").addClass("show active")
		}
	}

	$('a[data-toggle="tab"]').on("click", function () {
		let newUrl;
		const hash = $(this).attr("href");
		if (hash == "#home") {
			newUrl = url.split("#")[0];
		} else {
			newUrl = url.split("#")[0] + hash;
		}
		newUrl += "/";
		history.replaceState(null, null, newUrl);
	});

	$('.imgt-gallery-item').magnificPopup({
		delegate: 'a',
		type: 'image',
		closeOnContentClick: false,
		closeBtnInside: false,
		mainClass: 'mfp-with-zoom mfp-img-mobile',
		gallery: {
			enabled: true
		},
		zoom: {
			enabled: true,
			duration: 300,
			opener: function(element) {
				return element.find('img');
			}
		}
	});

	$(".tt-carousel-cont").owlCarousel({
		loop:true,
		margin:10,
		autoplay:true,
		navText : ['<i class="fa fa-long-arrow-left tt-arrow-ic" aria-hidden="true"/>','<i class="fa fa-long-arrow-right tt-arrow-ic" aria-hidden="true"/>'],
		mouseDrag: true,
		touchDrag: true,
		autoplayTimeout: 2500,
		autoplayHoverPause: true,
		smartSpeed: 1000,
		slideTransition: 'linear',
		fluidSpeed: true,
		items:1,
		margin: 20,
		nav:true,
		dots: false
	})
});
