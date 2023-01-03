# Snowflake

3D paper snowflakes implemented using Three.js. You begin with a sheet of virtual paper and perform
a sequence of "fold" and "cut" operations. Once you're happy with the result, you press ESC or "unfold"
icon to see the final result.

Snowflake should work on most of the mainstream web browsers, and was tested in Firefox, Safari and 
Chrome on Windows, Linux, iOS, MacOS and Android.

Please don't judge Snowflake strictly -- I'm not a frontender and created it as a New Year 2023 gift 
for my wife. It took me about 3 days to get from the concept to the "final" result.

## Examples

![A sample green snowflake](snowflake-green.jpg)

## Build

Currently there's nothing to build, the entire "application" is nothing more than just a set of static
JavaScript/HTML/CSS files. `main.js` is a good starting point.

## Bugs and limitations

- The folding/cutting line is "infinite", which makes it harder to make small cutouts.
- There's no single-step unfolding operation, which doesn't help with the small cutouts either.
- There's no undo operation, making it too easy to screw things up.
- The "welcome" page is in Russian (it was a gift after all!)
- The "result" doesn't display correctly on some of the phones for some reason.

## License

(C) Constantine Kulak, 2022.

Snowflake is licensed under the GNU Public License, Version 3.
