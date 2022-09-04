#![allow(unused_macros)]

macro_rules! impl_tuples_with {
    (
        $target:path : []
        $(| [
            $({$($pre:tt)*})*
        ])?
    ) => {
        // $target!($(
        //     $(
        //         $($pre)*
        //     ),*
        // )?);
    };
    (
        $target:path : [
            {$($next:tt)*}
            $($rest:tt)*
        ] $(| [
            $({$($pre:tt)*})*
        ])?
    ) => {
        $target!(
            $($($($pre)*,)*)?
            $($next)*
        );
        impl_tuples_with!(
            $target : [
                $($rest)*
            ] | [
                $($({$($pre)*})*)?
                {$($next)*}
            ]
        );
    };
}

macro_rules! impl_tuples {
    ($target:path; no_unit) => {
        impl_tuples_with!(
            $target : [
                {A: 0}
                {B: 1}
                {C: 2}
                {D: 3}
                {E: 4}
                {F: 5}
                {G: 6}
                {H: 7}
                {I: 8}
                {J: 9}
                {K: 10}
                {L: 11}
                {M: 12}
            ]
        );
    };
    ($target:path) => {
        $target!();
        impl_tuples!($target; no_unit);
    };
}

macro_rules! ignore {
	($($ignored:tt)*) => {};
}
