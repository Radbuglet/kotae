module.exports = {
    content: [
	"./src/**/*.{html,js,ts,jsx,tsx}",
    ],
    theme: {
	extend: {
	    colors: {
		"matcha": {
		    "50": "#F4F6F3",
		    "100": "#E8EEE7",
		    "200": "#D1DDD0",
		    "300": "#BACBB8",
		    "400": "#A3BAA1",
		    "500": "#8BA888",
		    "600": "#6B8D67",
		    "700": "#506A4E",
		    "800": "#364734",
		    "900": "#1B231A",
		    'dark': "#44624a",
		    'normal': "#8ba888",
		    'light': "#c0cfb2",
		    'paper': "#F6F4EE",
		    'ink': "#3C3B44",
		},
	    },
	},
    },
    plugins: [],
}