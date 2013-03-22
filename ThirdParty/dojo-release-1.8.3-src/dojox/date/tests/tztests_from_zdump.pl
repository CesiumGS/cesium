#!/usr/bin/perl -w

use strict;

use lib './lib';

use DateTime::TimeZone;
use File::Spec;
use Getopt::Long;
use DateTime;

my %opts;
GetOptions( 'name:s'     => \@{ $opts{name} },
            'zoneinfo:s' => \$opts{zoneinfo},
            'zdump:s'    => \$opts{zdump},
            'verbose'    => \$opts{verbose},
            'help'       => \$opts{help},
          );

if ( $opts{help} )
{
    print <<'EOF';

This script uses the zdump utility to generate comprehensive tests for
time zones.

Tests are generated as files in the tztests/ directory starting with "tz_".

By default, it generates tests for all time zones.

For each time zone name, it checks to see that the zoneinfo directory
has a corresponding file.  This is done because zdump will happily
generate garbage output if given a non-existent time zone name.

Note, if your version of the zoneinfo data is different from that used
to generate the Perl time zone modules then you will almost certainly
end up generating some tests that fail.

It takes the following arguments:

  --name      Only create tests for this zone.
              May be given multiple times.

  --zoneinfo  The location of your zoneinfo directory.
              Defaults to /usr/share/zoneinfo.

  --zdump     Path to zdump binary.  Default is just 'zdump'.

  --verbose   Blab about what it's doing as it does it.

  --help      What you are reading

EOF

    exit;
}

$opts{zoneinfo} ||= '/usr/share/zoneinfo';

die "No zoneinfo directory at $opts{zoneinfo}!\n" unless -d $opts{zoneinfo};

$opts{zdump} ||= 'zdump';

my $x = 1;
my %months = map { $_ => $x++ }
             qw( Jan Feb Mar Apr May Jun
	         Jul Aug Sep Oct Nov Dec);

my @pieces = qw( year month day hour minute second );

my @names = @{ $opts{name} } ? @{ $opts{name} } : DateTime::TimeZone::all_names();
foreach my $tz_name (@names)
{
    unless ( -e File::Spec->catfile( $opts{zoneinfo}, split /\//, $tz_name ) )
    {
        print "\nNo zoneinfo file for $tz_name - skipping\n" if $opts{verbose};
        next;
    }

    print "\nGetting change data for $tz_name\n" if $opts{verbose};

    my @tests;
    my $command = "$opts{zdump} -v $tz_name";
    my @lines = `$command`;

    die qq|Nothing returning from calling "$command".  Did you specify a valid zdump binary?\n|
        unless @lines;

    foreach my $line (@lines)
    {
        # This seems to happen on 64-bit systems.
        next if $line =~ /= NULL$/;

        my ( $utc_mon_name, $utc_day, $utc_hour, $utc_min, $utc_sec, $utc_year,
             $loc_mon_name, $loc_day, $loc_hour, $loc_min, $loc_sec, $loc_year,
             $short_name, $is_dst ) =
                 $line =~
                     m/ ^
                        \w+(?:\/[\w\/-]+)? # zone name
                        \s+
                        \w\w\w        # UTC day name
                        \s+
                        (\w\w\w)      # UTC month name
                        \s+
                        (\d+)         # UTC day of month
                        \s+
                        (\d\d):(\d\d):(\d\d)  # UTC time
                        \s+
                        (\d\d\d\d)    # UTC year
                        \s+
                        (?:UTC|GMT)   # some systems say one, some the other
                        \s+
                        =
                        \s+
                        \w\w\w        # local day name
                        \s+
                        (\w\w\w)      # local month name
                        \s+
                        (\d+)         # local day of month
                        \s+
                        (\d\d):(\d\d):(\d\d)  # local time
                        \s+
                        (\d\d\d\d)    # local year
                        \s+
                        (\w+)         # local short name
                        \s+
                        isdst=(1|0)
                      /x;

        unless ($1)
        {
            warn "Can't parse zump output:\n$line\n";
            next;
        }

        my $utc_month = $months{$utc_mon_name};
        my $loc_month = $months{$loc_mon_name};

		my $dt = DateTime->new( year => 1 * $utc_year,
								month => (1 * $utc_month),
								day => 1 * $utc_day,
								hour => 1 * $utc_hour,
								minute => 1 * $utc_min,
								second => 1 * $utc_sec,
								time_zone => 'UTC', );
		$dt->set_time_zone($tz_name);
        # use '1 * ' to make sure everything is treated as numbers,
        push @tests, { time_zone => $tz_name,
                       short_name => $short_name,
					   epoch	  => $dt->epoch,
                       offset     => (($dt->offset * -1) / 60),
                       edge       => 1,
                     }
    }

	# Just some fairly-current tests - non-edgecase
	my $currDt = DateTime->new( year => 2009,
                                month => 1,
                                day => 5,
                                hour => 10,
                                minute => 30,
                                second => 0,
                                time_zone => 'UTC', );
	$currDt->set_time_zone($tz_name);
	push @tests, { time_zone => $tz_name,
                       short_name => $currDt->time_zone_short_name,
					   epoch	  => $currDt->epoch,
                       offset     => (($currDt->offset * -1) / 60),
                       edge       => 0,
                     };
	$currDt = DateTime->new( year => 2009,
                                month => 7,
                                day => 5,
                                hour => 10,
                                minute => 30,
                                second => 0,
                                time_zone => 'UTC', );
	$currDt->set_time_zone($tz_name);
	push @tests, { time_zone => $tz_name,
                       short_name => $currDt->time_zone_short_name,
					   epoch	  => $currDt->epoch,
                       offset     => (($currDt->offset * -1) / 60),
                       edge       => 0,
                     };
					

    unless (@tests)
    {
        print "No change data in time_t range for $tz_name - can't create tests\n" if $opts{verbose};
        next;
    }

    local *T;

    (my $test_file_name = $tz_name) =~ s,/,-,g;
    my $file = File::Spec->catfile( 'tztests', "tz_$test_file_name.json" );
    open T, ">$file"
        or die "Cannot write to $file: $!";

    print "Creating tests for $tz_name in $file\n" if $opts{verbose};

    my $test_count = scalar @tests * 9;

	my $started = 0;

    foreach my $t (@tests)
    {
		if (!$started){
			print T <<"EOF";
({
	name: "date.timezone.$test_file_name",
	runTest: function(t){
		var tz = "$tz_name";
EOF
			$started = 1;
		}
		print T <<"EOF";
		doh.checkDate({tzOffset: $t->{offset}, tzAbbr: "$t->{short_name}"}, $t->{epoch}000, tz, $t->{edge});
EOF
	}
	if($started){
    	print T <<"EOF";
	}
})
EOF
	}
}
